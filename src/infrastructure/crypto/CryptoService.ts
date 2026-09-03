import argon2 from 'react-native-argon2';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  Buffer,
} from 'react-native-quick-crypto';

export class CryptoService {
  // 1. Derivación de Clave Maestra (Argon2id)
  // Convierte el PIN del usuario en una clave de 256 bits (32 bytes)
  static async deriveKey(pin: string, salt: string): Promise<string> {
    const options = {
      secret: '',
      hashLength: 32, // 256 bits
      timeCost: 4,
      memoryCost: 65536, // 64 MB
      parallelism: 2,
      type: 'id', // Argon2id (más seguro contra ataques de canal lateral)
      outputType: 'hex',
    };

    try {
      const result = await argon2(pin, salt, options);
      return result.rawHash; // Devuelve la clave en formato hexadecimal
    } catch (error) {
      throw new Error('Error al derivar la clave maestra');
    }
  }

  // 2. Generar Salt y IV (Vectores de Inicialización)
  static generateSalt(): string {
    return randomBytes(16).toString('hex'); // 128 bits
  }

  static generateIV(): Buffer {
    return randomBytes(12); // 96 bits (Estándar para GCM)
  }

  // 3. Cifrado (AES-256-GCM)
  // Cifra el texto plano y devuelve el IV + texto cifrado + tag de autenticación
  static encrypt(text: string, keyHex: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = this.generateIV();

    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Formato de salida: IV:AuthTag:TextoCifrado
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  // 4. Descifrado (AES-256-GCM)
  static decrypt(encryptedData: string, keyHex: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
