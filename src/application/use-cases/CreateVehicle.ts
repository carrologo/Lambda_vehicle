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
    try {
      // Guardar referencia a documentos y deudas antes de limpiar el objeto
      const documentsToSave = vehicle.documents;
      const debtsToSave = vehicle.debts;
      

      // Subir imágenes si existen
      if (vehicle.images && vehicle.images.length > 0) {
        const urlImages = await this.uploadImagesRepository.uploadImages(
          vehicle.images,
          `vehicles/${vehicle.brand}/${vehicle.line}/${vehicle.model}`
        );

        if (!urlImages) {
          throw new Error("No se pudieron subir las imágenes.");
        }

        vehicle.url_images = urlImages;
        delete vehicle.images;
      }

      // Limpiar propiedades no necesarias para la DB
      delete vehicle.allImages;
      delete vehicle.documents; // No queremos guardar documentos en la tabla vehicle
      delete vehicle.debts; // No queremos guardar deudas en la tabla vehicle

      // Guardar vehículo y obtener el ID
      const savedEntity = await this.vehicleRepository.save(
        VehicleEntittyMapper.toEntity(vehicle)
      );

      const vehicleId = savedEntity.id;

      if (!vehicleId) {
        throw new Error("No se pudo obtener el ID del vehículo guardado.");
      }

      // Enviar documentos si existen
      if (documentsToSave && documentsToSave.length > 0) {
        for (const doc of documentsToSave) {
          doc.idVehicle = vehicleId;
          await this.documentRepository.save(doc);
        }
      }

      console.log("Vehicle created with ID:", debtsToSave);

      // Enviar deudas si existen
      if (debtsToSave && debtsToSave.length > 0) {
        for (const debt of debtsToSave) {
          debt.VehicleId = vehicleId;
          await this.debtRepository.save(debt);
        }
      }

      return "El vehículo fue ingresado correctamente.";
    } catch (error) {
      throw new Error(
        `Failed to create Vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
