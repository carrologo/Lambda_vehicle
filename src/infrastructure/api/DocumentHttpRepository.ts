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

  async update(documentId: number, data: Partial<Document>): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      await axios.patch(`${apiUrl}/documents/${documentId}`, data, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating document:", error);
      throw new Error(
        `Failed to update document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getByVehicleId(vehicleId: number): Promise<Document[]> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await axios.get(
        `${apiUrl}/documents/vehicle/${vehicleId}`
      );
      return response.data.map((doc: any) =>
        new Document(
          new Date(doc.expirationDate),
          doc.documentTypeId,
          doc.idVehicle,
          doc.category,
          doc.id
        )
      );
    } catch (error) {
      console.error("Error getting documents from API:", error);
      return []; // Retorna array vacío si no hay documentos o hay error
    }
  }

  async getByVehicleIds(vehicleIds: number[]): Promise<Document[]> {
    if (vehicleIds.length === 0) {
      return [];
    }

    // Para la implementación HTTP, podemos hacer llamadas en paralelo
    const promises = vehicleIds.map((id) => this.getByVehicleId(id));
    const results = await Promise.all(promises);

    // Aplanar el array de arrays
    return results.flat();
  }
}
