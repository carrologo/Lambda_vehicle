import { Debt } from "../entities/Debt";

export interface IDebtRepository {
  save(debt: Debt): Promise<void>;
}
