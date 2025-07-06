import { Vehicle } from "../../../domain/entities/Vehicle";
import { VehicleEntity } from "../entities/VehicleEntity";


export class VehicleEntittyMapper {
  static toEntity(vehicle: Vehicle): VehicleEntity {
    return new VehicleEntity(
      vehicle.id,
      vehicle.type,
      vehicle.brand,
      vehicle.line,
      vehicle.version,
      vehicle.transmission,
      vehicle.traction,
      vehicle.fuel_type,
      vehicle.kms,
      vehicle.model,
      vehicle.displacement,
      vehicle.seat_material,
      vehicle.airbags,
      vehicle.images,
      vehicle.url_images,
      vehicle.allImages
    );
  }
}