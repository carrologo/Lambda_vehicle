import { IVehicleRepository } from "../../domain/repositories/VehicleRepository";
import { Vehicle } from "../../domain/entities/Vehicle";

export class DetailVehicle {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async execute(id: number): Promise<Vehicle> {
    try {
      const vehicle = await this.vehicleRepository.findById(id);
      
    if (!vehicle) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      return vehicle;
    } catch (error) {
        throw new Error(
            `Failed to get Vehicle: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
  }
}
