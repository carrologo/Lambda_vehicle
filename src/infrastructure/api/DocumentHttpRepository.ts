import axios from "axios";
import { Document } from "../../domain/entities/Document";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";

export class DocumentHttpRepository implements IDocumentRepository {
  private apiUrl: string | null = null;

  private async getApiUrl(): Promise<string> {
    if (!this.apiUrl) {
      const secrets = await getGoogleSecrets();
      this.apiUrl = secrets.DOCUMENTS_API_URL;
    }
    return this.apiUrl!;
  }

  async save(document: Document): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      console.log("Saving document to API:", apiUrl);
      await axios.post(`${apiUrl}/documents`, document, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error saving document to API:", error);
      throw new Error(
        `Failed to save document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
