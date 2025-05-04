import { APIGatewayProxyHandler } from "aws-lambda";
import { VehicleRepository } from "../database/SupabaseVehicleRepository";
import { CreateVehicle } from "../../application/use-cases/CreateVehicle";
import { VehicleMapper } from "../../application/mapper/VehicleMapper";
import { ValidationError } from "../../domain/entities/errors/ValidationError";
import { corsResponse } from "./CorsResponse";
import { UploadImagesRepository } from "../google/UploadImagesRepository";

const vehicleRepository = new VehicleRepository();
const uploadImagesRepository = new UploadImagesRepository();
const createVehicle = new CreateVehicle(vehicleRepository, uploadImagesRepository);
/**
 * @swagger
 * /vehicle:
 *   post:
 *     summary: Create a new vehicle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               brand:
 *                 type: string
 *               line:
 *                 type: string
 *               fuel_type:
 *                 type: string
 *               kms:
 *                 type: number
 *               model:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Validation error
 */

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const response = await createVehicle.execute(VehicleMapper.toDomain(body));

    return corsResponse(201, { message: response });
  } catch (error) {
    if (error instanceof ValidationError) {
      return corsResponse(400, {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    return corsResponse(500, {
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};





