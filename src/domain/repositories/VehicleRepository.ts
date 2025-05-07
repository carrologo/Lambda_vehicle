import { Vehicle } from "../entities/Vehicle";

export interface IVehicleRepository {
  save(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: number): Promise<Vehicle | null>;
}