import { IDownloadImagesFromFolder } from "../../domain/repositories/IDownloadImagesFromFolder";
import { google } from "googleapis";

export class DownloadImagesFromFolder implements IDownloadImagesFromFolder {
  private drive;

  constructor(auth?: any) {
    // Si no se pasa auth, lo crea usando variables de entorno
    if (!auth) {
      auth = new google.auth.GoogleAuth({
        credentials: {
          type: process.env.GOOGLE_TYPE,
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID,
          universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
        },
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
    }
    this.drive = google.drive({ version: "v3", auth });
  }

  // Extrae el ID de la carpeta desde la URL
  private extractFolderId(folderUrl: string): string | null {
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async downloadImagesFromFolder(folderUrl: string): Promise<{ name: string; buffer: Buffer }[]> {
    const folderId = this.extractFolderId(folderUrl);
    if (!folderId) throw new Error("Invalid folder URL");

    // Listar archivos en la carpeta
    const filesRes = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
    });

    const files = filesRes.data.files || [];
    const images: { name: string; buffer: Buffer }[] = [];

    for (const file of files) {
      if (file.mimeType?.startsWith("image/")) {
        const res = await this.drive.files.get(
          { fileId: file.id!, alt: "media" },
          { responseType: "arraybuffer" }
        );
        images.push({ name: file.name!, buffer: Buffer.from(res.data as ArrayBuffer) });
      }
    }
    return images;
  }
}