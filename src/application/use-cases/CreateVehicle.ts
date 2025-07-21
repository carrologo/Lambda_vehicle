import { Vehicle } from "../../domain/entities/Vehicle";
import { IUploadImagesRepository } from "../../domain/repositories/IUploadImagesRepository";
import { VehicleEntittyMapper } from "../../infrastructure/database/mapper/VehicleEntityMapper";
import { VehicleRepository } from "../../infrastructure/database/SupabaseVehicleRepository";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { IDebtRepository } from "../../domain/repositories/IDebtRepository";

export class CreateVehicle {
  constructor(
    private vehicleRepository: VehicleRepository,
    private uploadImagesRepository: IUploadImagesRepository,
    private documentRepository: IDocumentRepository,
    private debtRepository: IDebtRepository
  ) {}

  async execute(vehicle: Vehicle): Promise<string> {
    // Guardar referencia a documentos y deudas antes de limpiar el objeto
    const documentsToSave = vehicle.documents;
    const debtsToSave = vehicle.debts;
    let uploadedImageUrls: string | null = null;
    
    try {
      // Subir imágenes si existen (esto se hace fuera de la transacción)
      if (vehicle.images && vehicle.images.length > 0) {
        uploadedImageUrls = await this.uploadImagesRepository.uploadImages(
          vehicle.images,
          `vehicles/${vehicle.brand}/${vehicle.line}/${vehicle.model}`
        );

        if (!uploadedImageUrls) {
          throw new Error("No se pudieron subir las imágenes.");
        }

        vehicle.url_images = uploadedImageUrls;
      } else {
        throw new Error("Debe haber al menos una imagen para subir.");
      }

      // Limpiar propiedades no necesarias para la DB
      delete vehicle.images;
      delete vehicle.allImages;
      delete vehicle.documents; // No queremos guardar documentos en la tabla vehicle
      delete vehicle.debts; // No queremos guardar deudas en la tabla vehicle

      // TODO: Implementar transacción real con Supabase
      // Por ahora, usamos el enfoque secuencial con rollback manual mejorado
      let vehicleId: number | null = null;

      try {
        // 1. Guardar vehículo
        const savedEntity = await this.vehicleRepository.save(
          VehicleEntittyMapper.toEntity(vehicle)
        );
        vehicleId = savedEntity.id || null;

        if (!vehicleId) {
          throw new Error("No se pudo obtener el ID del vehículo guardado.");
        }

        // 2. Guardar documentos
        if (documentsToSave && documentsToSave.length > 0) {
          for (const doc of documentsToSave) {
            doc.idVehicle = vehicleId;
            await this.documentRepository.save(doc);
            // NOTE: Necesitaríamos el ID del documento para un rollback más preciso
          }
        }

        // 3. Guardar deudas
        if (debtsToSave && debtsToSave.length > 0) {
          for (const debt of debtsToSave) {
            debt.VehicleId = vehicleId;
            await this.debtRepository.save(debt);
          }
        }

        return "El vehículo fue ingresado correctamente.";
        
      } catch (dbError) {
        // Rollback: intentar limpiar todo lo que se pudo guardar
        console.error("Error during database operations, attempting rollback:", dbError);
        
        if (vehicleId) {
          try {
            // Eliminar en orden inverso: primero deudas, luego documentos, finalmente vehículo
            await this.debtRepository.delete(vehicleId);
            await this.documentRepository.delete(vehicleId);
            await this.vehicleRepository.delete(vehicleId);
          } catch (rollbackError) {
            console.error("Error during rollback:", rollbackError);
            // En un sistema real, aquí se debería notificar para limpieza manual
          }
        }
        
        throw new Error(
          `Failed to save vehicle data: ${
            dbError instanceof Error ? dbError.message : "Unknown database error"
          }`
        );
      }
      
    } catch (error) {
      // Si hay error en subida de imágenes o cualquier otra operación
      throw new Error(
        `Failed to create Vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
