// BACKEND/firebase/firebase-admin.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const {
  loggerInfo = console.log,
  loggerWarn = console.warn,
  loggerError = console.error
} = require('../utils/logger') || {}; // fallback to console if logger not exported as expected

let initialized = false;

/**
 * Try to load service account JSON from multiple locations:
 * 1) process.env.FIREBASE_SERVICE_ACCOUNT_PATH
 * 2) ./serviceAccountKey.json (firebase folder)
 * 3) ../config/firebase-service-account.json
 */
function findServiceAccountPath() {
  const candidates = [];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    candidates.push(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }

  // firebase folder (this file's folder)
  candidates.push(path.join(__dirname, 'serviceAccountKey.json'));

  // config folder at project root
  candidates.push(path.join(__dirname, '..', 'config', 'firebase-service-account.json'));
  candidates.push(path.join(__dirname, '..', '..', 'config', 'firebase-service-account.json'));

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (err) {
      // ignore and try next
    }
  }

  return null;
}

function initializeFirebaseApp() {
  if (initialized) return true;

  try {
    const keyPath = findServiceAccountPath();
    if (!keyPath) {
      loggerWarn('⚠️ Firebase service account key not found. Expected at FIREBASE_SERVICE_ACCOUNT_PATH or firebase/serviceAccountKey.json or config/firebase-service-account.json');
      return false;
    }

    const raw = fs.readFileSync(keyPath, 'utf8');
    const serviceAccount = JSON.parse(raw);

    if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
      loggerError('❌ Invalid Firebase service account JSON (missing keys)');
      return false;
    }

    // Only initialize if no apps exist
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      loggerInfo('✓ Firebase Admin SDK initialized successfully');
    } else {
      loggerInfo('Firebase Admin SDK already initialized (existing app found)');
    }

    initialized = true;
    return true;
  } catch (err) {
    loggerError('❌ Firebase initialization error: ' + (err && err.message ? err.message : err));
    return false;
  }
}

/**
 * Return firebase.messaging() instance or null
 */
function getMessaging() {
  if (!initialized) {
    const ok = initializeFirebaseApp();
    if (!ok) return null;
  }

  try {
    return admin.messaging();
  } catch (err) {
    loggerError('Error getting Firebase messaging instance: ' + err.message);
    return null;
  }
}

// Attempt init at require-time (safe)
initializeFirebaseApp();

module.exports = {
  admin,
  isInitialized: () => initialized,
  getMessaging,
  initializeFirebaseApp, // exported for tests or manual re-init
};
