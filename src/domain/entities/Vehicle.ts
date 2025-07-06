import { ValidationError } from "./errors/ValidationError";
import { Document } from "./Document";

export interface IVehicle {
  id?: number;
  type: string;
  brand: string;
  line: string;
  version?: string;
  transmission?: string;
  traction?: string;
  fuel_type: string;
  kms: number;
  model: Date;
  displacement?: number;
  seat_material?: string;
  airbags?: boolean;
  images?: Images[]; 
  url_images?: string;
  allImages?: string[];
  isSendDocuments?: boolean;
  documents?: Document[];

}


 export interface Images {
  base64: string;
  name: string;
 }

export class Vehicle implements IVehicle {
  id?: number;
  type: string;
  brand: string;
  line: string;
  version?: string;
  transmission?: string;
  traction?: string;
  fuel_type: string;
  kms: number;
  model: Date;
  displacement?: number;
  seat_material?: string;
  airbags?: boolean;
  images?: Images[];
  url_images?: string;
  allImages?: string[];
  isSendDocuments?: boolean = false;
  documents?: Document[];// Cambiado a string[] para almacenar URLs de imágenes

  constructor(data: IVehicle) {
    this.id = data.id;
    this.type = data.type;
    this.brand = data.brand;
    this.line = data.line;
    this.version = data.version;
    this.transmission = data.transmission;
    this.traction = data.traction;
    this.fuel_type = data.fuel_type;
    this.kms = data.kms;
    this.model = data.model;
    this.displacement = data.displacement;
    this.seat_material = data.seat_material;
    this.airbags = data.airbags;
    this.images = data.images;
    this.url_images = data.url_images;
    this.allImages = data.allImages;
    this.documents = data.documents;
    this.isSendDocuments = data.isSendDocuments ?? false;

    this.validate();
  }

  private validate(): void {
    const errors: { field: string; message: string }[] = [];

    const rules = [
      { field: "type", isValid: !!this.type, message: "This field is required." },
      { field: "brand", isValid: !!this.brand, message: "This field is required." },
      { field: "line", isValid: !!this.line, message: "This field is required." },
      { field: "fuel_type", isValid: !!this.fuel_type, message: "This field is required." },
      { field: "kms", isValid: this.kms !== undefined && this.kms !== null, message: "This field is required." },
      { field: "model", isValid: !!this.model, message: "This field is required." },
      { field: "kms", isValid: this.kms >= 0, message: "Kilometraje no puede ser negativo." },
    ];

    rules.forEach((rule) => {
      if (!rule.isValid) {
        errors.push({ field: rule.field, message: rule.message });
      }
    });

    if (errors.length > 0) {
      throw new ValidationError("Validation failed.", errors);
    }
  }
}