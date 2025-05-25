import { IDownloadImagesFromFolder } from "../../domain/repositories/IDownloadImagesFromFolder";
import { google } from "googleapis";

export class DownloadImagesFromFolder implements IDownloadImagesFromFolder {
  private drive;

  constructor(auth?: any) {
    if (!auth) {
      auth = new google.auth.GoogleAuth({
        credentials: {
          type: process.env.GOOGLE_TYPE,
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID,
          universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
        },
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
    }
    this.drive = google.drive({ version: "v3", auth });
  }

  private extractFileId(fileUrl: string): string | null {
    // Soporta /file/d/ID y ?id=ID
    let match = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    match = fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return null;
  }
  async downloadImageFromUrl(
    fileUrl: string
  ): Promise<{ name: string; buffer: Buffer; mimeType?: string  }> {
    const fileId = this.extractFileId(fileUrl);
    if (!fileId) throw new Error("Invalid file URL");

    const meta = await this.drive.files.get({
      fileId,
      fields: "name, mimeType",
    });

    const res = await this.drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    return {
      name: meta.data.name || "image",
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: meta.data.mimeType,
    };
  }
}
