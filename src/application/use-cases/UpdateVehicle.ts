import { IVehicleRepository } from "../../domain/repositories/VehicleRepository";
import { Vehicle } from "../../domain/entities/Vehicle";
import { ValidationError } from "../../domain/entities/errors/ValidationError";

export class UpdateVehicle {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(id: number, vehicleData: Vehicle): Promise<Vehicle> {
    try {
      // Get the existing vehicle data
      const existingVehicle = await this.vehicleRepository.findById(id);
      
      if (!existingVehicle) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      // Update the vehicle in the repository
      return await this.vehicleRepository.update(id, vehicleData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(
        `Failed to update vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
} 