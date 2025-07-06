export class Document {
  constructor(
    public expirationDate: Date,
    public documentTypeId: number,
    public idVehicle?: number | null,
    public category?: string | null
  ) {}
}

