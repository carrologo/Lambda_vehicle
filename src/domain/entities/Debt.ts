export class Debt {
  constructor(
    public amount: number,
    public TypeDebtId: number,
    public VehicleId?: number | null,
    public id?: number | null
  ) {}
}
