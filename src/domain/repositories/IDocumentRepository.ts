import { Document } from "../entities/Document";

export interface IDocumentRepository {
  save(document: Document): Promise<void>;
  update(documentId: number, data: Partial<Document>): Promise<void>;
}
