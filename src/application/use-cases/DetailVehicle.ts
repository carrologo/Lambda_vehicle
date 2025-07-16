import { IVehicleRepository } from "../../domain/repositories/VehicleRepository";
import { Vehicle } from "../../domain/entities/Vehicle";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";

export class DetailVehicle {
  constructor(
    private vehicleRepository: IVehicleRepository,
    private documentRepository: IDocumentRepository,
    private debtRepository: IDebtRepository
  ) {}

  async execute(id: number): Promise<Vehicle> {
    try {
      const vehicle = await this.vehicleRepository.findById(id);

      if (!vehicle) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      // Obtener documentos y deudas del vehículo
      try {
  
        vehicle.debts = await this.debtRepository.getByVehicleId(id);
      } catch (error) {
        console.warn(`Error loading documents/debts for vehicle ${id}:`, error);
        vehicle.documents = [];
        vehicle.debts = [];
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
