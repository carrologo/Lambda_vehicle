import { Vehicle } from "../../domain/entities/Vehicle";
import { IUploadImagesRepository } from "../../domain/repositories/IUploadImagesRepository";
import { VehicleRepository } from "../../infrastructure/database/SupabaseVehicleRepository";
export class CreateVehicle {
  constructor(
    private vehicleRepository: VehicleRepository,
    private uploadImagesRepository: IUploadImagesRepository
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
          delete vehicle.images; // Eliminar la propiedad images después de subirlas
          await this.vehicleRepository.save(vehicle);
        }
      }
      await this.vehicleRepository.save(vehicle);

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
