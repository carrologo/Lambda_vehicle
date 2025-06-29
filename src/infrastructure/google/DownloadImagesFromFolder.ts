import { IDownloadImagesFromFolder } from "../../domain/repositories/IDownloadImagesFromFolder";
import { google } from "googleapis";
import { getGoogleSecrets } from "./helperGoogleSecrets";

export class DownloadImagesFromFolder implements IDownloadImagesFromFolder {
  private drive;
  private secrets: Record<string, string> | null = null;

  private async init() {
    if (!this.secrets) {
    this.secrets = await getGoogleSecrets();
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: this.secrets.GOOGLE_TYPE,
          project_id: this.secrets.GOOGLE_PROJECT_ID,
          private_key_id: this.secrets.GOOGLE_PRIVATE_KEY_ID,
          private_key: this.secrets.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          client_email: this.secrets.GOOGLE_CLIENT_EMAIL,
          client_id: this.secrets.GOOGLE_CLIENT_ID,
          universe_domain: this.secrets.GOOGLE_UNIVERSE_DOMAIN,
        },
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      this.drive = google.drive({ version: "v3", auth });
    }
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
    await this.init();
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
