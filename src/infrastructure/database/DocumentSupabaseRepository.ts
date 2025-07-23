import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Document } from "../../domain/entities/Document";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";

export class DocumentSupabaseRepository implements IDocumentRepository {
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

  async save(document: Document): Promise<void> {
    await this.init();

    // Primero crear el documento en la tabla "document"
    const { data: docData, error: docError } = await this.supabase!.from(
      "document"
    )
      .insert({
        expiration_date: document.expiration_date,
        category: document.category,
        document_type_id: document.document_type_id,
      })
      .select()
      .single();

    if (docError) {
      console.error("Error inserting document:", docError);
      throw new Error(docError.message);
    }

    // Luego crear la relación en "vehicle_document"
    const { error: relError } = await this.supabase!.from(
      "vehicle_document"
    ).insert({
      document_id: docData.id,
      vehicle_id: document.idVehicle,
    });

    if (relError) {
      console.error("Error inserting vehicle_document relation:", relError);
      throw new Error(relError.message);
    }
  }

  async getByVehicleId(vehicleId: number): Promise<Document[]> {
    await this.init();
    const { data, error } = await this.supabase!.from("vehicle_document")
      .select(
        `
        id,
        document_id,
        vehicle_id,
        document (
          id,
          expiration_date,
          category,
          document_type_id
        )
      `
      )
      .eq("vehicle_id", vehicleId);

    if (error) {
      console.error("Error fetching documents:", error);
      return [];
    }

    return (data || []).map(
      (item: any) =>
        new Document(
          new Date(item.document.expiration_date),
          item.document.document_type_id,
          item.vehicle_id,
          item.document.category,
          item.document.id
        )
    );
  }

  async getByVehicleIds(vehicleIds: number[]): Promise<Document[]> {
    await this.init();
    
    if (vehicleIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase!.from("vehicle_document")
      .select(
        `
        id,
        document_id,
        vehicle_id,
        document (
          id,
          expiration_date,
          category,
          document_type_id
        )
      `
      )
      .in("vehicle_id", vehicleIds);

    if (error) {
      console.error("Error fetching documents:", error);
      return [];
    }

    return (data || []).map(
      (item: any) =>
        new Document(
          new Date(item.document.expiration_date),
          item.document.document_type_id,
          item.vehicle_id,
          item.document.category,
          item.document.id
        )
    );
  }

  async update(documentId: number, data: Partial<Document>): Promise<void> {
    await this.init();
    const updateData: any = {};

    if (data.category !== undefined) updateData.category = data.category;
    if (data.expiration_date !== undefined)
      updateData.expiration_date = data.expiration_date;
    if (data.document_type_id !== undefined)
      updateData.document_type_id = data.document_type_id;

    const { error } = await this.supabase!.from("document")
      .update(updateData)
      .eq("id", documentId);

    if (error) {
      console.error("Error updating document:", error);
      throw new Error(error.message);
    }
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
