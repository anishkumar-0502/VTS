const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const {
  loggerInfo = console.log,
  loggerWarn = console.warn,
  loggerError = console.error
} = require('../utils/logger') || {};

const FCM_V1_API_URL_TEMPLATE = 'https://fcm.googleapis.com/v1/projects/{projectId}/messages:send';

let authClient = null;
let projectId = null;

function findServiceAccountPath() {
  const candidates = [];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    candidates.push(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }

  candidates.push(path.join(__dirname, 'serviceAccountKey.json'));
  candidates.push(path.join(__dirname, '..', 'config', 'firebase-service-account.json'));
  candidates.push(path.join(__dirname, '..', '..', 'config', 'firebase-service-account.json'));

  

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (err) {
      // ignore
    }
  }

  return null;
}

async function initializeAuth() {
  if (authClient && projectId) {
    return true;
  }

  try {
    const keyPath = findServiceAccountPath();
    if (!keyPath) {
      loggerError('❌ FCM v1: Service account key not found');
      return false;
    }

    const raw = fs.readFileSync(keyPath, 'utf8');
    const serviceAccount = JSON.parse(raw);

    if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
      loggerError('❌ FCM v1: Invalid service account JSON');
      return false;
    }

    projectId = serviceAccount.project_id;

    authClient = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    loggerInfo('✓ FCM v1 OAuth2 authentication initialized');
    return true;
  } catch (error) {
    loggerError(`❌ FCM v1 Auth Error: ${error.message}`);
    return false;
  }
}

async function getAccessToken() {
  try {
    if (!authClient) {
      const ok = await initializeAuth();
      if (!ok) return null;
    }

    const token = await authClient.getAccessToken();
    return token.token;
  } catch (error) {
    loggerError(`❌ FCM v1 Token Error: ${error.message}`);
    return null;
  }
}

async function sendFCMv1Single(token, title, body, data = {}) {
  try {
    const ok = await initializeAuth();
    if (!ok) {
      return { success: false, error: 'Auth failed' };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'No access token' };
    }

    const apiUrl = FCM_V1_API_URL_TEMPLATE.replace('{projectId}', projectId);

    const message = {
      message: {
        token: token,
        notification: {
          title,
          body
        },
        data: data && Object.keys(data).length > 0 ? data : undefined
      }
    };

    loggerInfo(`📨 FCM v1 Sending to single token: ${token.substring(0, 30)}...`);

    const response = await axios.post(apiUrl, message, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    loggerInfo(`✅ FCM v1 Single message sent: ${response.data.name}`);
    return { success: true, messageId: response.data.name };
  } catch (error) {
    loggerError(`❌ FCM v1 Single Send Error: ${error.message}`);
    if (error.response?.data) {
      loggerError(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

async function sendFCMv1Multicast(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    loggerWarn('⚠️ FCM v1: No tokens provided');
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  try {
    const ok = await initializeAuth();
    if (!ok) {
      return { successCount: 0, failureCount: tokens.length, responses: [] };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { successCount: 0, failureCount: tokens.length, responses: [] };
    }

    const apiUrl = FCM_V1_API_URL_TEMPLATE.replace('{projectId}', projectId);

    loggerInfo(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    loggerInfo(`📨 FCM v1 MULTICAST - Sending to ${tokens.length} tokens`);
    loggerInfo(`   Title: "${title}"`);
    loggerInfo(`   Body: "${body}"`);
    loggerInfo(`   Data keys: ${Object.keys(data).join(', ') || 'none'}`);
    loggerInfo(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let successCount = 0;
    let failureCount = 0;
    const responses = [];

    for (const token of tokens) {
      try {
        const message = {
          message: {
            token: token,
            notification: {
              title,
              body
            },
            data: data && Object.keys(data).length > 0 ? data : undefined
          }
        };

        const response = await axios.post(apiUrl, message, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        successCount++;
        responses.push({
          success: true,
          messageId: response.data.name,
          token: token.substring(0, 20) + '...'
        });

        loggerInfo(`✅ Sent to token: ${token.substring(0, 20)}...`);
      } catch (error) {
        failureCount++;
        responses.push({
          success: false,
          error: error.response?.data?.error?.message || error.message,
          token: token.substring(0, 20) + '...'
        });

        loggerWarn(`❌ Failed for token: ${token.substring(0, 20)}... | Error: ${error.message}`);
      }
    }

    loggerInfo(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    loggerInfo(`📊 FCM v1 MULTICAST RESULTS:`);
    loggerInfo(`   Success: ${successCount}/${tokens.length}`);
    loggerInfo(`   Failed: ${failureCount}/${tokens.length}`);
    loggerInfo(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return {
      successCount,
      failureCount,
      responses
    };
  } catch (error) {
    loggerError(`❌ FCM v1 Multicast Error: ${error.message}`);
    return { successCount: 0, failureCount: tokens.length, responses: [] };
  }
}

module.exports = {
  sendFCMv1Single,
  sendFCMv1Multicast,
  initializeAuth,
  getAccessToken
};
