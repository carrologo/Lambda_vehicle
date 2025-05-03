import { Vehicle } from "../entities/Vehicle";

export interface IVehicleRepository {
  save(vehicle: Vehicle): Promise<Vehicle>;
  }