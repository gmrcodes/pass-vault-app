import RNFS from 'react-native-fs';
import { pick, keepLocalCopy, isCancel } from '@react-native-documents/picker';
import Share from 'react-native-share';
import { CryptoService } from '../crypto/CryptoService';
import { VaultService } from './VaultService';

export class BackupService {
  private static BACKUP_EXTENSION = '.pvb';

  // 1. EXPORTAR (Subir a Drive)
  static async exportVault(): Promise<void> {
    try {
      const vaultPath = VaultService.getVaultPath();

      const exists = await RNFS.exists(vaultPath);
      if (!exists) {
        throw new Error('No hay datos para exportar');
      }

      const tempFilePath = `${RNFS.CachesDirectoryPath}/vault_backup${this.BACKUP_EXTENSION}`;
      await RNFS.copyFile(vaultPath, tempFilePath);

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
      ) {
        return;
      }
      throw new Error('Error al exportar el backup');
    }
  }

  // 2. IMPORTAR (Descargar de Drive y restaurar)
  static async importVault(masterKey: string): Promise<void> {
    try {
      // Abrir selector nativo de archivos
      const result = await pick();

      if (!result || result.length === 0) return; // Usuario canceló

      const file = result[0];

      // Crear copia local del archivo seleccionado
      const localCopies = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName: file.name || 'backup.pvb',
          },
        ],
        destination: 'cachesDirectory',
      });

      if (!localCopies || localCopies.length === 0) {
        throw new Error('No se pudo copiar el archivo');
      }

      const localFile = localCopies?.[0] as any;
      const sourceUri = localFile?.uri;

      if (!sourceUri) throw new Error('No se pudo acceder al archivo local');

      // Leer el archivo .pvb seleccionado
      const fileContent = await RNFS.readFile(sourceUri, 'utf8');

      // Validar que el archivo sea legítimo intentando descifrarlo
      const decryptedJson = await CryptoService.decrypt(fileContent, masterKey);
      JSON.parse(decryptedJson);

      // Sobrescribir la bóveda local con el backup importado
      const vaultPath = VaultService.getVaultPath();
      await RNFS.writeFile(vaultPath, fileContent, 'utf8');
    } catch (error) {
      // Ignorar si el usuario cancela la selección
      if (isCancel(error)) {
        return;
      }
      throw new Error(
        'Archivo de backup inválido, corrupto o clave incorrecta',
      );
    }
  }
}
