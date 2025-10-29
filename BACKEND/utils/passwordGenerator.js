const capitalizeRandomly = (char) => {
  return Math.random() < 0.5 ? char.toLowerCase() : char.toUpperCase();
};

const pickRandomChar = (source) => {
  return source.charAt(Math.floor(Math.random() * source.length));
};

const generateEmailBasedPassword = (email, letterCount = 5) => {
  const localPart = (email || '').split('@')[0] || '';
  const lettersPool = localPart.replace(/[^a-zA-Z]/g, '') || 'user';

  let letters = '';
  for (let i = 0; i < letterCount; i++) {
    const char = pickRandomChar(lettersPool);
    letters += capitalizeRandomly(char);
  }

  const digits = String(Math.floor(100 + Math.random() * 900));
  return `${letters}@${digits}`;
};

const generateRandomPassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

module.exports = {
  generateEmailBasedPassword,
  generateRandomPassword
};
