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
}
