import CryptoJS from 'crypto-js';

// Get encryption key from environment (you should set this in your .env)
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'your-32-character-secret-key-here';

/**
 * Encrypt sensitive data before storing in database
 */
export const encryptData = (data: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data after retrieving from database
 */
export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash passwords using bcrypt-like algorithm
 */
export const hashPassword = (password: string): string => {
  // Using SHA256 with salt for simplicity (in production, use bcrypt)
  const salt = CryptoJS.lib.WordArray.random(128/8);
  const hash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  });
  
  return salt.toString() + ':' + hash.toString();
};

/**
 * Verify password against hash
 */
export const verifyPassword = (password: string, hash: string): boolean => {
  try {
    const [saltStr, hashStr] = hash.split(':');
    const salt = CryptoJS.enc.Hex.parse(saltStr);
    
    const computedHash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    return computedHash.toString() === hashStr;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

/**
 * Generate a secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return CryptoJS.lib.WordArray.random(length).toString();
};

/**
 * Encrypt Stripe customer ID for storage
 */
export const encryptStripeCustomerId = (customerId: string): string => {
  return encryptData(customerId);
};

/**
 * Decrypt Stripe customer ID from storage
 */
export const decryptStripeCustomerId = (encryptedCustomerId: string): string => {
  return decryptData(encryptedCustomerId);
};

/**
 * Encrypt payment method data
 */
export const encryptPaymentMethod = (paymentMethod: any): string => {
  return encryptData(JSON.stringify(paymentMethod));
};

/**
 * Decrypt payment method data
 */
export const decryptPaymentMethod = (encryptedPaymentMethod: string): any => {
  const decrypted = decryptData(encryptedPaymentMethod);
  return JSON.parse(decrypted);
};


