import axios from "axios";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Document } from "../../domain/entities/Document";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";

export class DocumentHttpRepository implements IDocumentRepository {
  private apiUrl: string | null = null;
  private secrets: Record<string, string> | null = null;
  private supabase: SupabaseClient | null = null;

  private async init() {
      if (!this.secrets) {
        this.secrets = await getGoogleSecrets();
        this.supabase = createClient(
          this.secrets.SUPABASE_URL,
          this.secrets.SUPABASE_KEY
        );
      }
    }

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

  async deleteVehicleDocument(vehicleId: number): Promise<void> {
    await this.init();
    const { error } = await this.supabase!.from("vehicle_document")
      .delete()
      .eq("vehicle_id", vehicleId);

    if (error) {
      console.error("Error deleting vehicle_document relation:", error);
      throw new Error(error.message);
    }
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.init();
    const { error } = await this.supabase!.from("document")
      .delete()
      .eq("id", documentId);

    if (error) {
      console.error("Error deleting document:", error);
      throw new Error(error.message);
    }
  }

  async updateAllDocuments(vehicleId: number, documents: Document[]): Promise<void> {
    await this.init();

    try {
      // 1. Obtener documentos actuales del vehículo con una consulta directa a Supabase
      const { data: currentData, error: fetchError } = await this.supabase!
        .from("vehicle_document")
        .select(`
          id,
          document_id,
          vehicle_id,
          document (
            id,
            expiration_date,
            category,
            document_type_id
          )
        `)
        .eq("vehicle_id", vehicleId);

      if (fetchError) {
        console.error("Error fetching current documents:", fetchError);
        throw new Error(fetchError.message);
      }

      // Convertir a objetos Document
      const currentDocuments = (currentData || []).map((item: any) =>
        new Document(
          new Date(item.document.expiration_date),
          item.document.document_type_id,
          item.vehicle_id,
          item.document.category,
          item.document.id
        )
      );

      // 2. Crear mapas para facilitar comparaciones
      const currentDocumentsMap = new Map(
        currentDocuments.map(doc => [doc.id!, doc])
      );
      const newDocumentsMap = new Map(
        documents.filter(doc => doc.id).map(doc => [doc.id!, doc])
      );

      // 3. Identificar documentos a actualizar
      for (const newDoc of documents) {
        if (newDoc.id && currentDocumentsMap.has(newDoc.id)) {
          // El documento existe, actualizarlo si hay cambios
          const currentDoc = currentDocumentsMap.get(newDoc.id)!;
          
          // Convertir newDoc.expiration_date a Date si es string
          const newExpirationDate = newDoc.expiration_date instanceof Date 
            ? newDoc.expiration_date 
            : new Date(newDoc.expiration_date);
          
          // Verificar si hay cambios
          const hasChanges = 
            currentDoc.document_type_id !== newDoc.document_type_id ||
            currentDoc.expiration_date.getTime() !== newExpirationDate.getTime() ||
            currentDoc.category !== newDoc.category;

          if (hasChanges) {
            // Actualizar directamente en Supabase
            const updateData: any = {};
            if (newDoc.category !== undefined) updateData.category = newDoc.category;
            if (newDoc.expiration_date !== undefined) updateData.expiration_date = newExpirationDate;
            if (newDoc.document_type_id !== undefined) updateData.document_type_id = newDoc.document_type_id;

            const { error: updateError } = await this.supabase!
              .from("document")
              .update(updateData)
              .eq("id", newDoc.id);

            if (updateError) {
              console.error("Error updating document:", updateError);
              throw new Error(updateError.message);
            }
          }
        }
      }

      // 4. Identificar documentos a eliminar
      for (const currentDoc of currentDocuments) {
        if (currentDoc.id && !newDocumentsMap.has(currentDoc.id)) {
          // El documento ya no existe en la nueva lista, eliminarlo
          // Primero eliminar la relación en vehicle_document
          const { error: deleteRelError } = await this.supabase!
            .from("vehicle_document")
            .delete()
            .eq("document_id", currentDoc.id)
            .eq("vehicle_id", vehicleId);

          if (deleteRelError) {
            console.error("Error deleting vehicle_document relation:", deleteRelError);
            throw new Error(deleteRelError.message);
          }
          
          // Luego eliminar el documento
          const { error: deleteDocError } = await this.supabase!
            .from("document")
            .delete()
            .eq("id", currentDoc.id);

          if (deleteDocError) {
            console.error("Error deleting document:", deleteDocError);
            throw new Error(deleteDocError.message);
          }
        }
      }

      // 5. Identificar documentos nuevos a crear
      for (const newDoc of documents) {
        if (!newDoc.id || newDoc.id === null) {
          // Es un documento nuevo, crearlo
          // Convertir expiration_date a Date si es string
          const expirationDate = newDoc.expiration_date instanceof Date 
            ? newDoc.expiration_date 
            : new Date(newDoc.expiration_date);

          // Primero crear el documento en la tabla "document"
          const { data: docData, error: docError } = await this.supabase!
            .from("document")
            .insert({
              expiration_date: expirationDate,
              category: newDoc.category,
              document_type_id: newDoc.document_type_id,
            })
            .select()
            .single();

          if (docError) {
            console.error("Error inserting document:", docError);
            throw new Error(docError.message);
          }

          // Luego crear la relación en "vehicle_document"
          const { error: relError } = await this.supabase!
            .from("vehicle_document")
            .insert({
              document_id: docData.id,
              vehicle_id: vehicleId,
            });

          if (relError) {
            console.error("Error inserting vehicle_document relation:", relError);
            throw new Error(relError.message);
          }
        }
      }

    } catch (error) {
      console.error("Error updating all documents:", error);
      throw new Error(
        `Failed to update all documents: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
