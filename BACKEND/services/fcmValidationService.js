const FCM_TOKEN_REGEX = /^[a-zA-Z0-9_\-:]{100,}$/;

const isValidFCMToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const trimmed = token.trim();

  if (trimmed.length < 100) {
    return false;
  }

  return FCM_TOKEN_REGEX.test(trimmed);
};

module.exports = { isValidFCMToken };
