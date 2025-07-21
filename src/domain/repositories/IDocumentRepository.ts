import { Document } from "../entities/Document";

export interface IDocumentRepository {
  save(document: Document): Promise<void>;
  getByVehicleId(vehicleId: number): Promise<Document[]>;
  getByVehicleIds(vehicleIds: number[]): Promise<Document[]>;
  update(documentId: number, data: Partial<Document>): Promise<void>;
  delete(vehicleId: number): Promise<void>;
}
