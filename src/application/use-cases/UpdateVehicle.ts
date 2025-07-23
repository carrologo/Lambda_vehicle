import { IVehicleRepository } from "../../domain/repositories/VehicleRepository";
import { Vehicle } from "../../domain/entities/Vehicle";
import { ValidationError } from "../../domain/entities/errors/ValidationError";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";
import { de } from "date-fns/locale";
import { DocumentMapper } from "./mapper/DocumentMapper";

export class UpdateVehicle {
  constructor(
    private vehicleRepository: IVehicleRepository,
    private documentRepository: IDocumentRepository,
    private debtRepository: IDebtRepository
  ) {}

  async execute(vehicleId: number, vehicleData: Vehicle): Promise<Vehicle> {
    try {
      // Get the existing vehicle data
      const existingVehicle = await this.vehicleRepository.findById(vehicleId);

      if (!existingVehicle) {
        throw new Error(`Vehicle with ID ${vehicleId} not found`);
      }

      // Guardar referencias a documentos y deudas antes de actualizar
      const documentsToUpdate = vehicleData.documents;
      const debtsToUpdate = vehicleData.debts;

      console.log("Vehicle data before transformation:", vehicleData);

      // Limpiar documentos y deudas del objeto vehicle antes de actualizar en BD
      delete vehicleData.images;
      delete vehicleData.documents;
      delete vehicleData.debts;

      // Actualizar datos del vehículo
      const updatedVehicle = await this.vehicleRepository.update(
        vehicleId,
        vehicleData
      );

      console.log("Updated vehicle:", updatedVehicle);

      // Actualizar documentos si se enviaron (usando el ID del vehículo del path)
      if (documentsToUpdate) {
        await this.documentRepository.updateAllDocuments(vehicleId, documentsToUpdate);
      }

      console.log("Updated documents for vehicle:", vehicleId);

      // Actualizar deudas si se enviaron (usando el ID del vehículo del path)
      if (debtsToUpdate) {
        await this.debtRepository.updateAllDebts(vehicleId, debtsToUpdate);
      }

      console.log("Updated debts for vehicle:", vehicleId);

  

      return updatedVehicle;
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
