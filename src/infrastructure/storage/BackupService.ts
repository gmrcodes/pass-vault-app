import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import Share from 'react-native-share';
import { CryptoService } from '../crypto/CryptoService';
import { VaultService } from './VaultService';

export class BackupService {
  private static BACKUP_EXTENSION = '.pvb';

  // 1. EXPORTAR (Subir a Drive)
  static async exportVault(): Promise<void> {
    try {
      const vaultPath = VaultService.getVaultPath();

      // Verificar si existe la bóveda
      const exists = await RNFS.exists(vaultPath);
      if (!exists) {
        throw new Error('No hay datos para exportar');
      }

      // Crear un archivo temporal con extensión .pvb
      const tempFilePath = `${RNFS.CachesDirectoryPath}/vault_backup${this.BACKUP_EXTENSION}`;
      await RNFS.copyFile(vaultPath, tempFilePath);

      // Abrir el menú nativo de compartir del móvil
      await Share.open({
        url: `file://${tempFilePath}`,
        type: 'application/octet-stream',
        title: 'Guardar Backup en Drive',
      });

      // Limpiar el archivo temporal
      await RNFS.unlink(tempFilePath);
    } catch (error: any) {
      // Ignorar si el usuario cierra el menú de compartir sin seleccionar nada
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
      const res = await DocumentPicker.pick({
        type: ['application/octet-stream', '*/*'],
      });

      const sourceUri = res[0].uri;

      // Leer el archivo .pvb seleccionado
      const fileContent = await RNFS.readFile(sourceUri, 'utf8');

      // Validar que el archivo sea legítimo intentando descifrarlo
      const decryptedJson = CryptoService.decrypt(fileContent, masterKey);
      JSON.parse(decryptedJson); // Si no es JSON válido, fallará aquí

      // Sobrescribir la bóveda local con el backup importado
      const vaultPath = VaultService.getVaultPath();
      await RNFS.writeFile(vaultPath, fileContent, 'utf8');
    } catch (error) {
      // Ignorar si el usuario cancela la selección
      if (DocumentPicker.isCancel(error)) {
        return;
      }
      throw new Error(
        'Archivo de backup inválido, corrupto o clave incorrecta',
      );
    }
  }
}
