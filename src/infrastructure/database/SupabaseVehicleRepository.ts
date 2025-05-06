import { createClient } from "@supabase/supabase-js";
import { Vehicle } from "../../domain/entities/Vehicle";
import { IVehicleRepository } from "../../domain/repositories/VehicleRepository";

export class VehicleRepository implements IVehicleRepository {
  private supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_KEY || ""
  );

  async save(vehicle: Vehicle): Promise<Vehicle> {
    const { error } = await this.supabase
      .from("vehicle")
      .insert(vehicle)
      .select()
      .single();

    if (error) {
      console.error("Error inserting client:", error);
      throw new Error(error.message);
    }

    return vehicle;
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
    const { findBy, value, orderBy, isAsc, page = 1, limit = 10 } = queryParams;
  
    let query = this.supabase.from("vehicle").select("*", { count: "exact" });
  
    if (findBy && value) {
      query = query.ilike(findBy, `%${value}%`); 
    }
  
    if (orderBy) {
      query = query.order(orderBy, { ascending: isAsc });
    }
  
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
  
    const { data, error, count } = await query;
  
    if (error) {
      console.error("Error fetching vehicles:", error);
      throw new Error("Failed to fetch vehicles");
    }
  
    return {
      data: data as Vehicle[],
      pagination: {
        page,
        total: count || 0,
      },
    };
  }
}
