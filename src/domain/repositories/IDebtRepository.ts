import { Debt } from "../entities/Debt";

export interface IDebtRepository {
  save(debt: Debt): Promise<void>;
  update(debtId: number, data: Partial<Debt>): Promise<void>;
}
