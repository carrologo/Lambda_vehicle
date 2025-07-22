export class Document {
  constructor(
    public expirationDate: Date,
    public document_type_id: number,
    public idVehicle?: number | null,
    public category?: string | null,
    public id?: number | null
  ) {}
}
