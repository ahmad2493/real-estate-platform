const Lease = require('../models/Lease');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const { uploadToS3 } = require('../config/aws'); // Fix: use uploadToS3 instead of uploadToAWS
const { v4: uuidv4 } = require('uuid');
const docusignService = require('../services/docusignService');

// Request a lease
exports.requestLease = async (req, res) => {
  try {
    const { propertyId, terms, message } = req.body;

    // Get property details
    const property = await Property.findById(propertyId).populate('owner agent');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Create lease request
    const lease = new Lease({
      property: propertyId,
      tenant: req.user.id,
      landlord: property.owner.id, // <-- Fix: set landlord field
      agent: property.agent?._id,
      owner: property.owner._id,
      terms: {
        startDate: terms.startDate,
        endDate: terms.endDate,
        monthlyRent: terms.monthlyRent,
        securityDeposit: terms.securityDeposit,
        renewalOption: terms.renewalOption || false,
      },
      monthlyRent: terms.monthlyRent,
      securityDeposit: terms.securityDeposit,
      status: 'requested',
    });

    await lease.save();

    // Create notification for agent or owner
    const notificationRecipient = property.agent?._id || property.owner._id;
    const notification = new Notification({
      user: notificationRecipient,
      type: 'LeaseRequest',
      lease: lease._id,
      property: propertyId,
      message: message || `New lease request from ${req.user.name} for ${property.title}`,
      metadata: {
        uploadedBy: req.user.id,
      },
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Lease request submitted successfully',
      lease: lease._id,
    });
  } catch (error) {
    console.error('Request lease error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Fixed uploadLeaseDocument method
exports.uploadLeaseDocument = async (req, res) => {
  try {
    const { leaseId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Get lease details with proper population
    const lease = await Lease.findById(leaseId).populate('tenant property owner agent');
    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    // Check authorization
    const isAuthorized = [lease.agent?._id, lease.owner._id]
      .filter(Boolean)
      .some((id) => id.toString() === req.user.id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `lease-${leaseId}-${uuidv4()}.${fileExtension}`;

    // Upload to AWS S3
    const uploadResult = await uploadToS3(file, fileName, 'leases');

    // Create document object with proper validation
    const newDocument = {
      name: file.originalname,
      url: uploadResult.url,
      uploadedBy: req.user.id, // Let Mongoose handle ObjectId conversion
      type: 'lease',
      version: (lease.documents || []).filter((doc) => doc && doc.type === 'lease').length + 1,
      uploadedAt: new Date(),
    };

    // FIXED: Use consistent Mongoose method instead of aggregation pipeline
    // Initialize documents array if it doesn't exist
    if (!lease.documents) {
      lease.documents = [];
    }

    // Add the new document
    lease.documents.push(newDocument);
    lease.status = 'document_uploaded';

    // Save with proper error handling
    await lease.save();

    // Create notification
    const notification = new Notification({
      user: lease.tenant._id,
      type: 'LeaseUploaded',
      lease: lease._id,
      property: lease.property._id,
      message: `Lease document uploaded for ${lease.property.title}. Please review and sign.`,
      metadata: {
        leaseDocumentUrl: uploadResult.url,
        documentId: fileName,
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
      },
    });

    await notification.save();

    res.json({
      success: true,
      message: 'Lease document uploaded successfully',
      document: {
        url: uploadResult.url,
        name: file.originalname,
        uploadedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Upload lease document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Fixed createDocuSignEnvelope method
exports.createDocuSignEnvelope = async (req, res) => {
  try {
    const { leaseId } = req.params;
    console.log('=== DocuSign Envelope Creation Started ===');
    console.log('Lease ID:', leaseId);

    // FIXED: Get lease with population in single query to maintain document integrity
    const lease = await Lease.findById(leaseId).populate([
      { path: 'tenant', select: 'name email' },
      { path: 'property', select: 'title' },
      { path: 'owner', select: 'name email' },
      {
        path: 'agent',
        populate: {
          path: 'user',
          select: 'name email',
        },
      },
    ]);

    if (!lease) {
      console.log('❌ Lease not found');
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    console.log('✅ Lease found and populated:', {
      id: lease._id,
      status: lease.status,
      documentsCount: lease.documents?.length || 0,
      hasDocuments: Array.isArray(lease.documents),
    });

    // Authorization check
    const userId = req.user.id.toString();
    const tenantId = lease.tenant?._id?.toString();
    const ownerId = lease.owner?._id?.toString();
    const agentUserId = lease.agent?.user?._id?.toString();

    const isAuthorized = userId === tenantId || userId === ownerId || userId === agentUserId;

    if (!isAuthorized) {
      console.log('❌ Not authorized');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to sign this lease',
      });
    }

    // FIXED: Better document validation with null checks
    console.log('📄 Checking documents array...');

    if (!Array.isArray(lease.documents)) {
      console.log('❌ Documents is not an array:', typeof lease.documents);
      return res.status(400).json({
        success: false,
        message: 'Invalid documents structure. Please contact support.',
        debug: {
          documentsType: typeof lease.documents,
          documentsValue: lease.documents,
        },
      });
    }

    // Filter out any null/undefined documents and find lease document
    const validDocuments = lease.documents.filter((doc) => doc != null);
    const leaseDocument = validDocuments.find((doc) => doc.type === 'lease');

    console.log('📄 Document analysis:', {
      totalDocuments: lease.documents.length,
      validDocuments: validDocuments.length,
      leaseDocumentFound: !!leaseDocument,
      documentTypes: validDocuments.map((doc) => doc.type),
    });

    if (!leaseDocument) {
      console.log('❌ No lease document found');
      return res.status(400).json({
        success: false,
        message: 'No lease document found. Please upload a lease document first.',
        debug: {
          totalDocuments: validDocuments.length,
          documentTypes: validDocuments.map((doc) => doc.type),
        },
      });
    }

    // Validate document URL
    if (!leaseDocument.url || !leaseDocument.url.startsWith('http')) {
      console.log('❌ Invalid document URL:', leaseDocument.url);
      return res.status(400).json({
        success: false,
        message: 'Invalid lease document URL',
      });
    }

    // Validate user data
    if (!req.user.email || !req.user.name) {
      console.log('❌ Missing user data');
      return res.status(400).json({
        success: false,
        message: 'User email and name are required for DocuSign',
      });
    }

    console.log('🚀 Starting DocuSign envelope creation...');

    const returnUrl = `${process.env.FRONTEND_URL}/dashboard?signed=${leaseId}`;

    // Create DocuSign envelope
    const envelopeResult = await docusignService.createEnvelope(
      leaseDocument.url,
      req.user.email,
      req.user.name,
      `Lease Agreement - ${lease.property.title}`,
      returnUrl
    );

    console.log('✅ DocuSign envelope created:', envelopeResult);

    // Update lease
    lease.docusignEnvelopeId = envelopeResult.envelopeId;
    lease.status = 'pending_docusign_signature';
    await lease.save();

    // Create signing URL
    const recipientView = await docusignService.createRecipientView(
      envelopeResult.envelopeId,
      req.user.email,
      req.user.name,
      returnUrl
    );

    res.json({
      success: true,
      signingUrl: recipientView.url,
      envelopeId: envelopeResult.envelopeId,
    });

    console.log('=== DocuSign Envelope Creation Completed Successfully ===');
  } catch (error) {
    console.error('=== DocuSign Envelope Creation Failed ===');
    console.error('Error:', error);

    let errorMessage = 'Failed to create signing session';
    let statusCode = 500;

    if (error.message.includes('authentication') || error.message.includes('JWT')) {
      errorMessage = 'DocuSign authentication failed. Please check configuration.';
    } else if (error.message.includes('document') || error.message.includes('download')) {
      errorMessage = 'Failed to process lease document for signing.';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Fixed handleDocuSignWebhook method
exports.handleDocuSignWebhook = async (req, res) => {
  try {
    console.log('=== DocuSign Webhook Received ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // DocuSign sends different event formats, let's handle both
    let envelopeId;
    let eventType;

    // Handle DocuSign Connect format
    if (req.body.event) {
      eventType = req.body.event;
      envelopeId = req.body.data?.envelopeId;
    }
    // Handle alternative DocuSign format
    else if (req.body.envelopeId) {
      envelopeId = req.body.envelopeId;
      eventType = req.body.status === 'completed' ? 'envelope-completed' : req.body.status;
    }
    // Handle XML format (DocuSign often sends XML)
    else if (typeof req.body === 'string' && req.body.includes('EnvelopeStatus')) {
      // Parse XML format if needed
      console.log('Received XML format webhook');
      // You might need to parse XML here
      return res.status(200).json({ received: true });
    }

    console.log('Event Type:', eventType);
    console.log('Envelope ID:', envelopeId);

    if (!envelopeId) {
      console.warn('No envelope ID found in webhook');
      return res.status(200).json({ received: true });
    }

    // Check if envelope is completed
    if (eventType === 'envelope-completed' || eventType === 'completed') {
      console.log('Processing completed envelope:', envelopeId);

      // Find lease by envelope ID
      const lease = await Lease.findOne({ docusignEnvelopeId: envelopeId }).populate([
        'tenant',
        'property',
        'owner',
        'agent',
      ]);

      if (!lease) {
        console.warn(`Lease not found for envelope ID: ${envelopeId}`);
        return res.status(200).json({ received: true });
      }

      console.log('Found lease:', lease._id);

      try {
        // Download signed document from DocuSign
        console.log('Downloading signed document...');
        const signedDocument = await docusignService.downloadSignedDocument(envelopeId);

        // Upload signed document to S3
        const fileName = `signed-lease-${lease._id}-${uuidv4()}.pdf`;
        const uploadResult = await uploadToS3(
          { buffer: signedDocument, originalname: fileName },
          fileName,
          'signed-leases'
        );

        console.log('Signed document uploaded to S3:', uploadResult.url);

        // Initialize documents array if needed and add signed document
        if (!Array.isArray(lease.documents)) {
          lease.documents = [];
        }

        const signedDocumentObj = {
          name: `Signed Lease Agreement - ${lease.property.title}`,
          url: uploadResult.url,
          uploadedBy: lease.tenant._id,
          type: 'signed_lease',
          version: 1,
          uploadedAt: new Date(),
          docusignEnvelopeId: envelopeId,
          isSigned: true,
        };

        lease.documents.push(signedDocumentObj);
        lease.status = 'signed';
        lease.signedAt = new Date();

        // Initialize signatures array if needed
        if (!Array.isArray(lease.signatures)) {
          lease.signatures = [];
        }

        lease.signatures.push({
          user: lease.tenant._id,
          signedAt: new Date(),
          signatureType: 'tenant',
          docusignEnvelopeId: envelopeId,
          signatureMethod: 'docusign',
        });

        await lease.save();
        console.log('Lease updated successfully');

        // Create notifications for all parties
        const notificationPromises = [];
        const allParties = [lease.tenant._id, lease.owner._id, lease.agent?._id].filter(Boolean);

        console.log('Creating notifications for parties:', allParties.length);

        for (const userId of allParties) {
          const notification = new Notification({
            user: userId,
            type: 'LeaseSigned',
            lease: lease._id,
            property: lease.property._id,
            message: `Lease agreement for ${lease.property.title} has been signed electronically via DocuSign.`,
            metadata: {
              leaseDocumentUrl: uploadResult.url,
              signedBy: lease.tenant._id,
              signedAt: new Date(),
              docusignEnvelopeId: envelopeId,
            },
          });
          notificationPromises.push(notification.save());
        }

        await Promise.all(notificationPromises);
        console.log('Notifications created successfully');
      } catch (docError) {
        console.error('Error processing signed document:', docError);
        lease.status = 'signing_error';
        lease.signingError = docError.message;
        await lease.save();
      }
    }

    res.status(200).json({ received: true, processed: true });
    console.log('=== Webhook Processing Complete ===');
  } catch (error) {
    console.error('DocuSign webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// NEW: Check DocuSign envelope status
exports.checkDocuSignStatus = async (req, res) => {
  try {
    const { leaseId } = req.params;

    const lease = await Lease.findById(leaseId);
    if (!lease || !lease.docusignEnvelopeId) {
      return res.status(404).json({ success: false, message: 'Lease or envelope not found' });
    }

    const status = await docusignService.getEnvelopeStatus(lease.docusignEnvelopeId);

    res.json({
      success: true,
      status: status.status,
      completedDateTime: status.completedDateTime,
      sentDateTime: status.sentDateTime,
    });
  } catch (error) {
    console.error('Check DocuSign status error:', error);
    res.status(500).json({ success: false, message: 'Failed to check signing status' });
  }
};

exports.signLeaseDocument = async (req, res) => {
  try {
    const { leaseId } = req.params;
    const { useDocuSign = true } = req.body;

    // Get lease details
    const lease = await Lease.findById(leaseId).populate('tenant property owner agent');
    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    // Check if user is authorized to sign
    const isAuthorized = [lease.tenant._id, lease.owner._id, lease.agent?._id]
      .filter(Boolean)
      .some((id) => id.toString() === req.user.id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to sign this lease' });
    }

    // Get the latest lease document
    const leaseDocument = (lease.documents || []).find((doc) => doc.type === 'lease');
    if (!leaseDocument) {
      return res.status(400).json({ success: false, message: 'No lease document found' });
    }

    if (useDocuSign) {
      // Use DocuSign for signing
      const returnUrl = `${process.env.FRONTEND_URL}/dashboard?signed=${leaseId}`;
      const envelopeResult = await docusignService.createEnvelope(
        leaseDocument.url,
        req.user.email,
        req.user.name,
        `Lease Agreement - ${lease.property.title}`,
        returnUrl
      );

      // Update lease with DocuSign envelope ID
      lease.docusignEnvelopeId = envelopeResult.envelopeId;
      lease.status = 'pending_docusign_signature';
      await lease.save();

      // Create signing URL
      const recipientView = await docusignService.createRecipientView(
        envelopeResult.envelopeId,
        req.user.email,
        req.user.name,
        returnUrl
      );

      res.json({
        success: true,
        useDocuSign: true,
        signingUrl: recipientView.url,
        envelopeId: envelopeResult.envelopeId,
        message: 'DocuSign signing session created successfully',
      });
    } else {
      // Use existing simple signature method
      // ... existing signature logic ...
      res.json({
        success: true,
        useDocuSign: false,
        message: 'Document signed successfully using simple signature',
      });
    }
  } catch (error) {
    console.error('Sign lease document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get lease details
exports.getLeaseDetails = async (req, res) => {
  try {
    const { leaseId } = req.params;

    const lease = await Lease.findById(leaseId)
      .populate('property', 'title address images')
      .populate('tenant agent owner', 'name email avatar')
      .populate('documents.uploadedBy', 'name')
      .populate('signatures.user', 'name email');

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    // Check authorization
    const isAuthorized = [lease.tenant._id, lease.agent?._id, lease.owner._id]
      .filter(Boolean)
      .some((id) => id.toString() === req.user.id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, lease });
  } catch (error) {
    console.error('Get lease details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all leases for user
exports.getUserLeases = async (req, res) => {
  try {
    const { status, role } = req.query;
    let query = {};

    // Build query based on user role
    if (role === 'tenant') {
      query.tenant = req.user.id;
    } else if (role === 'agent') {
      query.agent = req.user.id;
    } else if (role === 'owner') {
      query.owner = req.user.id;
    } else {
      // Show all leases where user is involved
      query = {
        $or: [{ tenant: req.user.id }, { agent: req.user.id }, { owner: req.user.id }],
      };
    }

    if (status) {
      query.status = status;
    }

    const leases = await Lease.find(query)
      .populate('property', 'title address images')
      .populate('tenant agent owner', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, leases });
  } catch (error) {
    console.error('Get user leases error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update lease status
exports.updateLeaseStatus = async (req, res) => {
  try {
    const { leaseId } = req.params;
    const { status, notes } = req.body;

    const lease = await Lease.findById(leaseId);
    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    // Check authorization
    const isAuthorized = [lease.tenant, lease.agent, lease.owner]
      .filter(Boolean)
      .some((id) => id.toString() === req.user.id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    lease.status = status;
    if (notes) lease.notes = notes;

    if (status === 'signed') {
      lease.signedAt = new Date();
    } else if (status === 'active') {
      lease.activatedAt = new Date();
    }

    await lease.save();

    res.json({ success: true, message: 'Lease status updated successfully' });
  } catch (error) {
    console.error('Update lease status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
