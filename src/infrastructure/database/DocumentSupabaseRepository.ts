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

  async delete(vehicleId: number): Promise<void> {
    await this.init();
    const { error } = await this.supabase!.from("vehicle_document")
      .delete()
      .eq("vehicle_id", vehicleId);

    if (error) {
      console.error("Error deleting vehicle_document relation:", error);
      throw new Error(error.message);
    }
  }
}
