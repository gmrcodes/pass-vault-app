import RNFS from 'react-native-fs';
import { pick, keepLocalCopy } from '@react-native-documents/picker';
import Share from 'react-native-share';
import { CryptoService } from '../crypto/CryptoService';
import { VaultService } from './VaultService';
import { SecureStorageService } from './SecureStorageService';

export class BackupService {
  private static BACKUP_EXTENSION = '.pvb';

  // 1. EXPORTAR (Subir a Drive)
  static async exportVault(): Promise<void> {
    try {
      const vaultPath = VaultService.getVaultPath();
      const exists = await RNFS.exists(vaultPath);
      if (!exists) throw new Error('No hay datos para exportar');

      const encryptedData = await RNFS.readFile(vaultPath, 'utf8');
      const salt = await SecureStorageService.getSalt();
      if (!salt) throw new Error('No se encontró el salt local');

      // Formato autocontenido: salt:iv:hmac:textocifrado
      const backupContent = `${salt}:${encryptedData}`;

      const tempFilePath = `${RNFS.CachesDirectoryPath}/vault_backup${this.BACKUP_EXTENSION}`;
      await RNFS.writeFile(tempFilePath, backupContent, 'utf8');

      await Share.open({
        url: `file://${tempFilePath}`,
        type: 'application/octet-stream',
        title: 'Guardar Backup en Drive',
      });

      await RNFS.unlink(tempFilePath);
    } catch (error: any) {
      if (
        error?.message === 'User did not share' ||
        error?.message === 'Share canceled'
      )
        return;
      throw new Error('Error al exportar el backup');
    }
  }

  // 2. IMPORTAR (Restaurar desde Drive)
  static async importVault(
    masterKey: string,
    backupPin: string,
  ): Promise<void> {
    try {
      const result = await pick();
      if (!result || result.length === 0) return;

      const file = result[0];
      let fileContent: string;

      try {
        // Estrategia 1: leer la URI de contenido directamente
        fileContent = await RNFS.readFile(file.uri, 'utf8');
      } catch {
        // Estrategia 2: copia local temporal
        const localCopies = await keepLocalCopy({
          files: [{ uri: file.uri, fileName: file.name || 'backup.pvb' }],
          destination: 'cachesDirectory',
        });

        const localFile = (localCopies && localCopies[0]) as any;
        const sourceUri =
          localFile?.uri || localFile?.copyUri || localFile?.path;
        if (!sourceUri) throw new Error('No se pudo acceder al archivo local');
        fileContent = await RNFS.readFile(sourceUri, 'utf8');
      }

      // Separar el salt incrustado del resto
      const firstColon = fileContent.indexOf(':');
      if (firstColon === -1) throw new Error('Formato de backup inválido');

      const embeddedSalt = fileContent.substring(0, firstColon);
      const encryptedData = fileContent.substring(firstColon + 1);

      // Derivar la clave con el PIN original del backup y su salt
      const backupKey = await CryptoService.deriveKey(backupPin, embeddedSalt);

      // Descifrar y validar integridad
      const decryptedJson = await CryptoService.decrypt(
        encryptedData,
        backupKey,
      );
      const credentials = JSON.parse(decryptedJson);

      // Re-cifrar con la Master Key actual y guardar
      await VaultService.saveVault(credentials, masterKey);
    } catch (error: any) {
      if (
        error?.code === 'E_DOCUMENT_PICKER_CANCELED' ||
        error?.message?.includes('cancel')
      )
        return;
      throw new Error(`Detalle técnico: ${error?.message || String(error)}`);
    }
  }
}
