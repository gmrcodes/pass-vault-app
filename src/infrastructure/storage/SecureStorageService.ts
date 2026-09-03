import * as Keychain from 'react-native-keychain';
import argon2 from 'react-native-argon2';
import Aes from 'react-native-aes-crypto';

export class SecureStorageService {
  private static SALT_KEY = 'vault_salt';
  private static PIN_HASH_KEY = 'vault_pin_hash';

  // 1. Guardar el Salt y el Hash del PIN (Solo se ejecuta en el primer setup)
  static async initializeVault(pin: string): Promise<void> {
    const salt = await this.generateRandomSalt();

    // Generamos un hash del PIN para verificarlo después sin guardar el PIN
    const pinHash = await argon2(pin, salt, {
      hashLength: 32,
      timeCost: 4,
      memoryCost: 65536,
      parallelism: 2,
      type: 'id',
      outputType: 'hex',
    } as any); // "as any" ignora la validación estricta de TypeScript

    // Guardamos en el Keychain/Keystore del dispositivo
    await Keychain.setGenericPassword(this.SALT_KEY, salt, {
      service: this.SALT_KEY,
    });
    await Keychain.setGenericPassword(this.PIN_HASH_KEY, pinHash.rawHash, {
      service: this.PIN_HASH_KEY,
    });
  }

  // 2. Verificar si el PIN ingresado es correcto
  static async verifyPin(pin: string): Promise<boolean> {
    const credentials = await Keychain.getGenericPassword({
      service: this.PIN_HASH_KEY,
    });

    if (!credentials) return false;

    const storedHash = credentials.password;
    const salt = await this.getSalt();

    if (!salt) return false;

    const currentHash = await argon2(pin, salt, {
      hashLength: 32,
      timeCost: 4,
      memoryCost: 65536,
      parallelism: 2,
      type: 'id',
      outputType: 'hex',
    } as any);

    return currentHash.rawHash === storedHash;
  }

  // 3. Obtener el Salt (Necesario para derivar la Master Key)
  static async getSalt(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({
      service: this.SALT_KEY,
    });
    return credentials ? credentials.password : null;
  }

  // 4. Borrar la bóveda (Para resetear la app)
  static async resetVault(): Promise<void> {
    await Keychain.resetGenericPassword({ service: this.SALT_KEY });
    await Keychain.resetGenericPassword({ service: this.PIN_HASH_KEY });
  }

  // Utilidad para generar salt aleatorio
  private static async generateRandomSalt(): Promise<string> {
    // Usamos un salt fijo de 16 bytes en hex para el hash del PIN
    return await Aes.randomKey(16);
  }
}
