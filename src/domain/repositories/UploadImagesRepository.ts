import { google } from 'googleapis';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class UploadImagesRepository {
  private drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: '/var/task/credentials.json', // Ruta del archivo de credenciales en Lambda
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Sube un archivo a Google Drive y devuelve la URL pública.
   * @param base64 - El archivo en formato base64.
   * @param name - El nombre del archivo.
   * @param mimeType - El tipo MIME del archivo.
   * @param folderId - El ID de la carpeta en Google Drive.
   * @returns La URL pública del archivo subido.
   */
  async upload(base64: string, name: string, mimeType: string, folderId: string): Promise<string> {
    try {
      // Convertir el base64 a un archivo temporal
      const buffer = Buffer.from(base64, 'base64');
      const filePath = path.join(os.tmpdir(), name);

      fs.writeFileSync(filePath, buffer);

      // Subir el archivo a Google Drive
      const res = await this.drive.files.create({
        requestBody: {
          name,
          parents: [folderId], // Carpeta donde se guardará el archivo
        },
        media: {
          mimeType,
          body: fs.createReadStream(filePath),
        },
        fields: 'id',
      });

      const fileId = res.data.id;

      // Hacer público el archivo
      await this.drive.permissions.create({
        fileId,
        requestBody: { type: 'anyone', role: 'reader' },
      });

      // Devolver la URL pública del archivo
      return `https://drive.google.com/uc?id=${fileId}`;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Error uploading file to Google Drive');
    }
  }
}