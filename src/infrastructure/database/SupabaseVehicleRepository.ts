import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Vehicle } from "../../domain/entities/Vehicle";
import { IVehicleRepository } from "../../domain/repositories/VehicleRepository";
import { getGoogleSecrets } from "../google/helperGoogleSecrets";
import { VehicleEntity } from "./entities/VehicleEntity";

export class VehicleRepository implements IVehicleRepository {
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

  async save(vehicle: VehicleEntity): Promise<VehicleEntity> {
    await this.init();
    const { error, data } = await this.supabase!
      .from("vehicle")
      .insert(vehicle)
      .select()
      .single();

    if (error) {
      console.error("Error inserting client:", error);
      throw new Error(error.message);
    }

    return data as VehicleEntity;
  }

  async findById(id: number): Promise<Vehicle | null> {
    await this.init();
    const { data, error } = await this.supabase!
      .from("vehicle")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No record found
      }
      throw new Error("Failed to fetch vehicle");
    }

    if (!data) {
      return null;
    }

    const vehicle = new Vehicle(data as any);
    return {
      ...vehicle,
      allImages: vehicle.url_images ? vehicle.url_images.split(",") : [],
    };
  }

  async update(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    await this.init();
    const { data, error } = await this.supabase!
      .from("vehicle")
      .update(vehicleData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(`Vehicle with ID ${id} not found`);
      }
      console.error("Error updating vehicle:", error);
      throw new Error("Failed to update vehicle");
    }

    if (!data) {
      throw new Error(`Vehicle with ID ${id} not found`);
    }

    const vehicle = new Vehicle(data as any);
    return {
      ...vehicle,
      allImages: vehicle.url_images ? vehicle.url_images.split(",") : [],
    };
  }

  async getAll(queryParams: {
    findBy?: string;
    value?: any;
    orderBy?: string;
    isAsc: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Vehicle[];
    pagination: {
      page: number;
      total: number;
    };
  }> {
    await this.init();
    const { findBy, value, orderBy, isAsc, page = 1, limit = 10 } = queryParams;
  
    let query = this.supabase!.from("vehicle").select("*", { count: "exact" });
  
    if (findBy && value) {
      query = query.ilike(findBy, `%${value}%`); 
    }
  
    if (orderBy) {
      query = query.order(orderBy, { ascending: isAsc });
    }
  
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
  
    const { data, error, count } = await query;

    const vehicles = (data || []).map((item) => {
      const vehicle = new Vehicle(item as any);
      return {
        ...vehicle,
        allImages: vehicle.url_images ? vehicle.url_images.split(",") : [],
      };
    });
  
    if (error) {
      console.error("Error fetching vehicles:", error);
      throw new Error("Failed to fetch vehicles");
    }
  
    return {
      data: vehicles as Vehicle[],
      pagination: {
        page,
        total: count || 0,
      },
    };
  }
}