// services/docusignService.js - FIXED VERSION
const docusign = require('docusign-esign');
const fs = require('fs');
const https = require('https');
const http = require('http');

class DocuSignService {
  constructor() {
    this.apiClient = new docusign.ApiClient();

    // Configure authentication
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    this.integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    this.userId = process.env.DOCUSIGN_USER_ID;
    this.privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH;

    // FIXED: Use correct base paths
    this.basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
    this.oAuthBasePath = process.env.DOCUSIGN_OAUTH_BASE_PATH || 'account-d.docusign.com';

    // Token caching
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  async authenticate() {
    try {
      // Check if we have a valid cached token
      if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
        this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + this.accessToken);
        return this.accessToken;
      }

      // Validate required environment variables
      if (!this.integrationKey || !this.userId || !this.privateKeyPath) {
        throw new Error(
          'Missing required DocuSign configuration: DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, or DOCUSIGN_PRIVATE_KEY_PATH'
        );
      }

      if (!fs.existsSync(this.privateKeyPath)) {
        throw new Error(`DocuSign private key file not found at: ${this.privateKeyPath}`);
      }

      const privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');

      const scopes = ['signature', 'impersonation'];

      // FIXED: Set OAuth base path before making requests
      this.apiClient.setOAuthBasePath(this.oAuthBasePath);

      console.log('Authenticating with DocuSign...', {
        integrationKey: this.integrationKey.substring(0, 8) + '...',
        userId: this.userId,
        oAuthBasePath: this.oAuthBasePath,
      });

      const results = await this.apiClient.requestJWTUserToken(
        this.integrationKey,
        this.userId,
        scopes,
        privateKey,
        3600
      );

      this.accessToken = results.body.access_token;
      this.tokenExpiresAt = new Date(Date.now() + results.body.expires_in * 1000 - 60000); // 1 minute buffer

      this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + this.accessToken);

      // FIXED: Get user info to verify account and get correct account ID
      console.log('Getting user info...');
      const userInfo = await this.apiClient.getUserInfo(this.accessToken);

      if (!userInfo.accounts || userInfo.accounts.length === 0) {
        throw new Error('No DocuSign accounts found for this user');
      }

      // FIXED: Use the first account if DOCUSIGN_ACCOUNT_ID is not set or find matching account
      let targetAccount = userInfo.accounts[0]; // Default to first account

      if (this.accountId) {
        const foundAccount = userInfo.accounts.find((acc) => acc.accountId === this.accountId);
        if (!foundAccount) {
          console.warn(
            `Specified account ID ${this.accountId} not found. Available accounts:`,
            userInfo.accounts.map((acc) => acc.accountId)
          );
          console.log('Using first available account:', targetAccount.accountId);
        } else {
          targetAccount = foundAccount;
        }
      }

      this.accountId = targetAccount.accountId;

      // FIXED: Set the correct base path with account-specific URL
      this.apiClient.setBasePath(targetAccount.baseUri + '/restapi');

      console.log('DocuSign authentication successful', {
        accountId: this.accountId,
        basePath: targetAccount.baseUri + '/restapi',
      });

      return this.accessToken;
    } catch (error) {
      console.error('DocuSign authentication error:', error);

      // Clear cached token on error
      this.accessToken = null;
      this.tokenExpiresAt = null;

      if (error.response && error.response.body) {
        console.error('DocuSign API Error Details:', error.response.body);
      }

      throw new Error(`Failed to authenticate with DocuSign: ${error.message}`);
    }
  }

  downloadDocument(url) {
    return new Promise((resolve, reject) => {
      console.log('Downloading document from URL:', url);

      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        reject(new Error('Invalid document URL'));
        return;
      }

      const client = url.startsWith('https:') ? https : http;

      const request = client.get(url, (response) => {
        console.log('Download response status:', response.statusCode);

        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          const redirectUrl = response.headers.location;
          console.log('Following redirect to:', redirectUrl);
          this.downloadDocument(redirectUrl).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download document: HTTP ${response.statusCode}`));
          return;
        }

        const chunks = [];
        let totalLength = 0;

        response.on('data', (chunk) => {
          chunks.push(chunk);
          totalLength += chunk.length;
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log('Document downloaded successfully, size:', totalLength);
          resolve(buffer);
        });

        response.on('error', reject);
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Document download timeout'));
      });
    });
  }

  async createEnvelope(documentUrl, signerEmail, signerName, documentName) {
    try {
      console.log('Creating DocuSign envelope...', {
        documentUrl: documentUrl?.substring(0, 50) + '...',
        signerEmail,
        signerName,
        documentName,
      });

      // Validate inputs
      if (!documentUrl || !signerEmail || !signerName || !documentName) {
        throw new Error('Missing required parameters for envelope creation');
      }

      await this.authenticate();

      // FIXED: Verify we have the account ID after authentication
      if (!this.accountId) {
        throw new Error('Account ID not available after authentication');
      }

      console.log('Using account ID:', this.accountId);

      // Download the PDF document
      const documentBuffer = await this.downloadDocument(documentUrl);

      if (!documentBuffer || documentBuffer.length === 0) {
        throw new Error('Downloaded document is empty');
      }

      const documentBase64 = documentBuffer.toString('base64');
      console.log('Document encoded to base64, size:', documentBase64.length);

      // Create the envelope definition
      const envelopeDefinition = new docusign.EnvelopeDefinition();
      envelopeDefinition.emailSubject = `Please sign: ${documentName}`;
      envelopeDefinition.status = 'sent';

      // Create document
      const document = new docusign.Document();
      document.documentBase64 = documentBase64;
      document.name = documentName;
      document.fileExtension = 'pdf';
      document.documentId = '1';

      envelopeDefinition.documents = [document];

      // Create signer with proper configuration
      const signer = new docusign.Signer();
      signer.email = signerEmail;
      signer.name = signerName;
      signer.recipientId = '1';
      signer.routingOrder = '1';
      signer.clientUserId = '1000'; // FIXED: Use a more unique client user ID

      // Add signature tab
      const signHere = new docusign.SignHere();
      signHere.documentId = '1';
      signHere.pageNumber = '1';
      signHere.recipientId = '1';
      signHere.tabLabel = 'SignHereTab';

      const tabs = new docusign.Tabs();
      tabs.signHereTabs = [signHere];
      signer.tabs = tabs;

      // Add recipient to envelope
      const recipients = new docusign.Recipients();
      recipients.signers = [signer];
      envelopeDefinition.recipients = recipients;

      console.log('Sending envelope to DocuSign...', {
        accountId: this.accountId,
        basePath: this.apiClient.basePath,
      });

      // Create envelope
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition: envelopeDefinition,
      });

      console.log('Envelope created successfully:', results.envelopeId);

      return {
        envelopeId: results.envelopeId,
        status: results.status,
      };
    } catch (error) {
      console.error('DocuSign create envelope error:', error);

      if (error.response) {
        console.error('HTTP Status:', error.response.status);
        console.error('Response Headers:', error.response.headers);
        console.error(
          'Response Body:',
          JSON.stringify(error.response.body || error.response.data, null, 2)
        );
      }

      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.response) {
        const apiError = error.response.body || error.response.data;
        if (apiError && apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError && apiError.errorDetails) {
          errorMessage = apiError.errorDetails.map((detail) => detail.message).join(', ');
        }
      }

      throw new Error(`Failed to create DocuSign envelope: ${errorMessage}`);
    }
  }

  async createRecipientView(envelopeId, signerEmail, signerName, returnUrl) {
    try {
      console.log('Creating recipient view...', { envelopeId, signerEmail });
      await this.authenticate();

      const viewRequest = new docusign.RecipientViewRequest();
      viewRequest.returnUrl = returnUrl;
      viewRequest.authenticationMethod = 'none';
      viewRequest.email = signerEmail;
      viewRequest.userName = signerName;
      viewRequest.clientUserId = '1000'; // FIXED: Must match the signer's clientUserId

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createRecipientView(this.accountId, envelopeId, {
        recipientViewRequest: viewRequest,
      });

      console.log('Recipient view created successfully');
      return {
        url: results.url,
      };
    } catch (error) {
      console.error('DocuSign create recipient view error:', error);
      throw new Error(`Failed to create DocuSign signing view: ${error.message}`);
    }
  }

  async getEnvelopeStatus(envelopeId) {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.getEnvelope(this.accountId, envelopeId);

      return {
        status: results.status,
        completedDateTime: results.completedDateTime,
        sentDateTime: results.sentDateTime,
      };
    } catch (error) {
      console.error('DocuSign get envelope status error:', error);
      throw new Error('Failed to get envelope status');
    }
  }

  async downloadSignedDocument(envelopeId, documentId = '1') {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.getDocument(this.accountId, envelopeId, documentId);

      return results;
    } catch (error) {
      console.error('DocuSign download document error:', error);
      throw new Error('Failed to download signed document');
    }
  }
}

module.exports = new DocuSignService();
