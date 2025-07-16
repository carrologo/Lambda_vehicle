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

  async execute(id: number, vehicleData: Vehicle): Promise<Vehicle> {
    try {
      // Get the existing vehicle data
      const existingVehicle = await this.vehicleRepository.findById(id);

      if (!existingVehicle) {
        throw new Error(`Vehicle with ID ${id} not found`);
      }

      // Guardar referencias a documentos y deudas antes de actualizar
      const documentsToUpdate = vehicleData.documents;
      const debtsToUpdate = vehicleData.debts;

      console.log("Vehicle data before transformation:", vehicleData);

      // Limpiar documentos y deudas del objeto vehicle antes de actualizar en BD
      delete vehicleData.documents;
      delete vehicleData.debts;

      // Actualizar datos del vehículo
      const updatedVehicle = await this.vehicleRepository.update(
        id,
        vehicleData
      );

      console.log("Updated vehicle:", updatedVehicle);

      // Actualizar documentos si se enviaron (usando el ID del vehículo del path)
      if (documentsToUpdate && documentsToUpdate.length > 0) {
        for (const doc of documentsToUpdate) {
          try {
            console.log("Processing document:", doc);
            if (doc.id) {
              const id = doc.id;
              delete doc.id
              // Actualizar documento existente
              await this.documentRepository.update(id, DocumentMapper.toDatabase(doc));
            } else {
              // Crear nuevo documento para este vehículo
              doc.idVehicle = id;
              console.log("Creating new document for vehicle:", doc);
              delete doc.id
              await this.documentRepository.save(doc);
            }
          } catch (error) {
            console.error(
              `Error processing document ${doc.id || "new"}:`,
              error
            );
            // Opcional: puedes decidir si continuar con los demás documentos o lanzar el error
            // throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      console.log("Updated documents for vehicle:", id);

      // Actualizar deudas si se enviaron (usando el ID del vehículo del path)
      if (debtsToUpdate && debtsToUpdate.length > 0) {
        for (const debt of debtsToUpdate) {
          if (debt.id) {
            const id = debt.id;
            delete debt.id
            // Actualizar deuda existente
            await this.debtRepository.update(id, debt);
          } else {
            // Crear nueva deuda para este vehículo
            debt.VehicleId = id;
            delete debt.id
            await this.debtRepository.save(debt);
          }
        }
      }

      console.log("Updated debts for vehicle:", id);

  

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
