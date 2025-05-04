import { google } from 'googleapis';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IUploadImagesRepository } from '../../domain/repositories/IUploadImagesRepository';
import { fileTypeFromBuffer } from 'file-type';
import * as dotenv from 'dotenv';
dotenv.config();

export class UploadImagesRepository implements IUploadImagesRepository {
  private drive;



  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), 
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
      }, 
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Sube múltiples archivos a Google Drive y devuelve la URL pública de la carpeta que los contiene.
   * @param images - Array de objetos con base64 y opcionalmente nombre.
   * @param folderName - El nombre de la carpeta donde se guardarán las imágenes.
   * @returns La URL pública de la carpeta.
   */
  async uploadImages(
    images: { base64: string; name?: string }[],
    folderName: string
  ): Promise<string> {
    try {
      // Verificar si la carpeta existe, si no, crearla
      const folderId = await this.getOrCreateFolder(folderName);

      for (const image of images) {
        const buffer = Buffer.from(image.base64, 'base64');

        const fileType = await fileTypeFromBuffer(buffer);
        if (!fileType) {
          throw new Error('No se pudo determinar el tipo MIME del archivo.');
        }

        const mimeType = fileType.mime; 
        const extension = fileType.ext; 

        const name = image.name || `file-${Date.now()}.${extension}`;

        const filePath = path.join(os.tmpdir(), name);
        fs.writeFileSync(filePath, buffer);

        await this.drive.files.create({
          requestBody: {
            name,
            parents: [folderId], 
          },
          media: {
            mimeType,
            body: fs.createReadStream(filePath),
          },
        });
      }

      // Hacer pública la carpeta
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: { type: 'anyone', role: 'reader' },
      });

      // Devolver la URL pública de la carpeta
      return `https://drive.google.com/drive/folders/${folderId}`;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw new Error('Error uploading files to Google Drive');
    }
  }

  /**
   * Obtiene el ID de una carpeta en Google Drive por su nombre, o la crea si no existe.
   * Si la carpeta es creada, se comparte con una cuenta personal.
   * @param folderName - El nombre de la carpeta.
   * @returns El ID de la carpeta.
   */
  private async getOrCreateFolder(folderName: string): Promise<string> {
    try {
      // Buscar la carpeta por nombre
      const res = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (res.data.files && res.data.files.length > 0) {
        // La carpeta ya existe, devolver su ID
        return res.data.files[0].id!;
      }

      // Crear la carpeta si no existe
      const folder = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      const folderId = folder.data.id!;

      // Compartir la carpeta con una cuenta personal
      await this.shareFolderWithPersonalAccount(folderId,  process.env.SHARED_FOLDER_EMAIL!);

      return folderId;
    } catch (error) {
      console.error('Error getting or creating folder:', error);
      throw new Error('Error getting or creating folder in Google Drive');
    }
  }

  /**
   * Comparte una carpeta con una cuenta personal.
   * @param folderId - El ID de la carpeta.
   * @param email - El correo electrónico de la cuenta personal.
   */
  private async shareFolderWithPersonalAccount(folderId: string, email: string): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: 'user', // Compartir con un usuario específico
          role: 'writer', // Permisos: "writer" (Editor) o "reader" (Lector)
          emailAddress: email, // Correo de la cuenta personal
        },
      });

      console.log(`Folder shared successfully with ${email}`);
    } catch (error) {
      console.error('Error sharing folder:', error);
      throw new Error('Error sharing folder in Google Drive');
    }
  }
}