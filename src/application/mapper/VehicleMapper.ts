import { Vehicle } from "../../domain/entities/Vehicle";


export class VehicleMapper {
    static toDomain(data: any): Vehicle {
        return new Vehicle({
        type: data.type,
        brand: data.brand,
        line: data.line,
        version: data.version,
        transmission: data.transmission,
        traction: data.traction,
        fuel_type: data.fuelType,
        kms: data.kms,
        model: data.model,
        displacement: data.displacement,
        seat_material: data.seatMaterial,
        airbags: data.airbags,
        images: data.images || [],
        documents: data.documents,
        debts: data.debts,
        plate: data.plate
        });
    }}