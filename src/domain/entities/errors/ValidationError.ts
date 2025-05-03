export class ValidationError extends Error {
    code: string;
    details: { field: string; message: string }[];
  
    constructor(message: string, details: { field: string; message: string }[]) {
      super(message);
      this.code = "VALIDATION_ERROR";
      this.details = details;
  
      Object.setPrototypeOf(this, ValidationError.prototype);
    }
  }