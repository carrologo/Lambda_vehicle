import { Document } from "../entities/Document";

export interface IDocumentRepository {
  save(document: Document): Promise<void>;
  getByVehicleId(vehicleId: number): Promise<Document[]>;
  getByVehicleIds(vehicleIds: number[]): Promise<Document[]>;
  update(documentId: number, data: Partial<Document>): Promise<void>;
  deleteVehicleDocument(vehicleId: number): Promise<void>;
  deleteDocument(documentId: number): Promise<void>;
  updateAllDocuments(vehicleId: number, documents: Document[]): Promise<void>;
}
