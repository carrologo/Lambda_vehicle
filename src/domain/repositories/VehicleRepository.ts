import { VehicleEntity } from "../../infrastructure/database/entities/VehicleEntity";
import { Vehicle } from "../entities/Vehicle";

export interface IVehicleRepository {
  save(vehicle: VehicleEntity): Promise<VehicleEntity>;
  findById(id: number): Promise<Vehicle | null>;
  update(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle>;
}