import { Debt } from "../entities/Debt";

export interface IDebtRepository {
  save(debt: Debt): Promise<void>;
  getByVehicleId(vehicleId: number): Promise<Debt[]>;
  getByVehicleIds(vehicleIds: number[]): Promise<Debt[]>;
  update(debtId: number, data: Partial<Debt>): Promise<void>;
  delete(vehicleId: number): Promise<void>;
}
