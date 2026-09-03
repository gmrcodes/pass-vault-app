import RNFS from 'react-native-fs';
import { CryptoService } from '../crypto/CryptoService';

// Definimos la interfaz de lo que vive en la memoria RAM
export interface Credential {
  id: string;
  service: string;
  user: string;
  password: string;
}

export class VaultService {
  // Ruta absoluta en el sistema de archivos del móvil (Privada para esta app)
  private static VAULT_FILE = `${RNFS.DocumentDirectoryPath}/passvault.enc`;

  // 1. Carga y descifra la bóveda desde el disco hacia la RAM
  static async loadVault(masterKey: string): Promise<Credential[]> {
    try {
      const exists = await RNFS.exists(this.VAULT_FILE);
      if (!exists) {
        return []; // Primera vez, la bóveda está vacía
      }

      // Leemos el texto cifrado del disco
      const encryptedData = await RNFS.readFile(this.VAULT_FILE, 'utf8');

      // Lo desciframos en memoria usando la Master Key
      const decryptedJson = CryptoService.decrypt(encryptedData, masterKey);

      return JSON.parse(decryptedJson) as Credential[];
    } catch (error) {
      // Si falla, suele ser porque la Master Key es incorrecta (PIN erróneo)
      // o el archivo está corrupto.
      console.error('Error al cargar la bóveda:', error);
      throw new Error('Datos corruptos o clave incorrecta');
    }
  }

  // 2. Cifra el array en RAM y lo guarda en el disco
  static async saveVault(
    credentials: Credential[],
    masterKey: string,
  ): Promise<void> {
    try {
      const jsonString = JSON.stringify(credentials);

      // Ciframos todo el JSON de una sola vez
      const encryptedData = CryptoService.encrypt(jsonString, masterKey);

      // Sobrescribimos el archivo en el disco
      await RNFS.writeFile(this.VAULT_FILE, encryptedData, 'utf8');
    } catch (error) {
      console.error('Error al guardar la bóveda:', error);
      throw new Error('No se pudo guardar la bóveda');
    }
  }

  // 3. Elimina la bóveda física (para resetear la app)
  static async deleteVault(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.VAULT_FILE);
      if (exists) {
        await RNFS.unlink(this.VAULT_FILE);
      }
    } catch (error) {
      console.error('Error al eliminar la bóveda:', error);
    }
  }

  // 4. Expone la ruta para que el BackupService pueda acceder al archivo
  static getVaultPath(): string {
    return this.VAULT_FILE;
  }
}
