import { Debt } from "../../domain/entities/Debt";

export interface DebtApiFormat {
  vehicle_id: number;
  amount: number;
  type_debt_id: number;
}

export class DebtMapper {
  static toApiFormat(debt: Debt): DebtApiFormat {
    return {
      vehicle_id: debt.VehicleId!,
      amount: debt.amount,
      type_debt_id: debt.TypeDebtId
    };
  }
}
