import { Vehicle } from "../Vehicle";
import { ValidationError } from "../errors/ValidationError";

describe("Vehicle", () => {
  it("should throw a validation error if required fields are missing", () => {
    expect(() => {
      new Vehicle({
        type: "",
        brand: "",
        line: "",
        fuel_type: "",
        kms: 10000,
        model: new Date(),
      });
    }).toThrowError(ValidationError);
  });

  it("should throw a validation error if kms is negative", () => {
    expect(() => {
      new Vehicle({
        type: "SUV",
        brand: "Toyota",
        line: "RAV4",
        fuel_type: "Gasoline",
        kms: -10,
        model: new Date(),
      });
    }).toThrowError(ValidationError);
  });

  it("should create a valid vehicle", () => {
    const vehicle = new Vehicle({
      type: "SUV",
      brand: "Toyota",
      line: "RAV4",
      fuel_type: "Gasoline",
      kms: 10000,
      model: new Date("2022-01-01"),
    });

    expect(vehicle).toBeInstanceOf(Vehicle);
    expect(vehicle.type).toBe("SUV");
    expect(vehicle.kms).toBe(10000);
  });

  it("should throw a validation error with correct details", () => {
    try {
      new Vehicle({
        type: "",
        brand: "",
        line: "",
        fuel_type: "",
        kms: -10,
        model: new Date(),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        expect(error.message).toBe("Validation failed.");
        expect(error.details).toEqual(
          expect.arrayContaining([
            { field: "type", message: "This field is required." },
            { field: "brand", message: "This field is required." },
            { field: "line", message: "This field is required." },
            { field: "fuel_type", message: "This field is required." },
            { field: "kms", message: "Kilometraje no puede ser negativo." },
          ])
        );
      } else {
        throw error;
      }
    }
  });
});