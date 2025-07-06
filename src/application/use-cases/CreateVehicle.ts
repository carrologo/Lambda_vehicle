import { Vehicle } from "../../domain/entities/Vehicle";
import { IUploadImagesRepository } from "../../domain/repositories/IUploadImagesRepository";
import { VehicleEntittyMapper } from "../../infrastructure/database/mapper/VehicleEntityMapper";
import { VehicleRepository } from "../../infrastructure/database/SupabaseVehicleRepository";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository"; // <-- Importa la interfaz

export class CreateVehicle {
  constructor(
    private vehicleRepository: VehicleRepository,
    private uploadImagesRepository: IUploadImagesRepository,
    private documentRepository: IDocumentRepository // <-- Inyecta el repo de documentos
  ) {}

  async execute(vehicle: Vehicle): Promise<string> {
    try {
      if (vehicle.images && vehicle.images.length > 0) {
        const urlImages = await this.uploadImagesRepository.uploadImages(
          vehicle.images || [],
          `vehicles/${vehicle.brand}/${vehicle.line}/${vehicle.model}`
        );

        if (urlImages.length === 0) {
          throw new Error("No se pudieron subir las imágenes.");
        } else {
          vehicle.url_images = urlImages;
          delete vehicle.images;
          delete vehicle.allImages;
          await this.vehicleRepository.save(
            VehicleEntittyMapper.toEntity(vehicle)
          );
        }
      }
      delete vehicle.allImages;
      const savedEntity = await this.vehicleRepository.save(
        VehicleEntittyMapper.toEntity(vehicle)
      );
      const vehicleId = savedEntity.id;

      if (vehicle.documents && vehicle.documents.length > 0 && vehicleId) {
        for (const doc of vehicle.documents) {
          doc.idVehicle = vehicleId;
          await this.documentRepository.save(doc);
        }
      }

      return "El vehículo fue ingresado correctamente.";
    } catch (error) {
      throw new Error(
        `Failed to creat Vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
