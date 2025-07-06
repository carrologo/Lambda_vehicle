export class VehicleEntity {
  constructor(
    public id: number | undefined,
    public type: string,
    public brand: string,
    public line: string,
    public version: string | undefined,
    public transmission: string | undefined,
    public traction: string | undefined,
    public fuel_type: string,
    public kms: number,
    public model: Date,
    public displacement: number | undefined,
    public seat_material: string | undefined,
    public airbags: boolean | undefined,
    public images: Images[] | undefined,
    public url_images: string | undefined,
    public allImages: string[] | undefined
  ) {}
}

export interface Images {
  base64: string;
  name: string;
}