import { Vehicle } from "../../domain/entities/Vehicle";
import { VehicleRepository } from "../../infrastructure/database/SupabaseVehicleRepository";
export class CreateVehicle {
  constructor(private vehicleRepository: VehicleRepository) {}

  async execute(vehicle: Vehicle): Promise<string> {
    try {
      await this.vehicleRepository.save(vehicle);

      return "El vehículo fue ingresado correctamente.";
    } catch (error) {
      throw new Error(
        `Failed to create client: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
