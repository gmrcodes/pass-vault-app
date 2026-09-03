import argon2 from 'react-native-argon2';
import Aes from 'react-native-aes-crypto';

export class CryptoService {
  // 1. Derivación de Clave Maestra (Argon2id) - SIN CAMBIOS
  static async deriveKey(pin: string, salt: string): Promise<string> {
    const options: any = {
      hashLength: 32,
      iterations: 4,
      memory: 65536,
      parallelism: 2,
      mode: 'argon2id',
      outputType: 'hex',
    };

    const result = await argon2(pin, salt, options);
    return result.rawHash;
  }

  // 2. Generar Salt y IV (Aleatorios y seguros)
  static async generateSalt(): Promise<string> {
    return await Aes.randomKey(16);
  }

  static async generateIV(): Promise<string> {
    return await Aes.randomKey(16);
  }

  // 3. Cifrado (AES-256-CBC + HMAC para autenticación)
  static async encrypt(text: string, keyHex: string): Promise<string> {
    const iv = await this.generateIV();

    // Cifrar
    const encrypted = await Aes.encrypt(text, keyHex, iv, 'aes-256-cbc');

    // Generar HMAC para asegurar que el archivo no fue alterado
    const hmac = await Aes.hmac256(encrypted, keyHex);

    // Formato: IV:HMAC:TextoCifrado
    return `${iv}:${hmac}:${encrypted}`;
  }

  // 4. Descifrado
  static async decrypt(encryptedData: string, keyHex: string): Promise<string> {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Formato de archivo inválido');

    const [iv, storedHmac, encryptedText] = parts;

    // 1. Verificar integridad (Autenticación)
    const calculatedHmac = await Aes.hmac256(encryptedText, keyHex);
    if (calculatedHmac !== storedHmac) {
      throw new Error('Integridad comprometida o clave incorrecta');
    }

    // 2. Descifrar
    return await Aes.decrypt(encryptedText, keyHex, iv, 'aes-256-cbc');
  }
}
