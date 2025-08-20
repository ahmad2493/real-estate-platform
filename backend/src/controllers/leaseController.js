const Lease = require('../models/Lease');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const { uploadToS3 } = require('../config/aws'); // Fix: use uploadToS3 instead of uploadToAWS
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

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

exports.uploadLeaseDocument = async (req, res) => {
  try {
    const { leaseId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Get lease details
    const lease = await Lease.findById(leaseId).populate('tenant property owner agent');
    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    // Check if user is authorized (agent or owner)
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

    // Create the document object with explicit type casting
    const newDocument = {
      name: String(file.originalname), // Explicit string cast
      url: String(uploadResult.url), // Explicit string cast
      uploadedBy: new mongoose.Types.ObjectId(req.user.id), // Proper ObjectId
      type: String('lease'), // Explicit string cast
      version: Number((lease.documents || []).filter((doc) => doc.type === 'lease').length + 1), // Explicit number cast
      uploadedAt: new Date(), // Proper Date object
    };

    // CRITICAL: Use updateOne with explicit field specification
    const updateResult = await Lease.updateOne({ _id: leaseId }, [
      {
        $set: {
          documents: {
            $ifNull: [{ $concatArrays: ['$documents', [newDocument]] }, [newDocument]],
          },
          status: 'document_uploaded',
        },
      },
    ]);

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    // Create notification for tenant
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
