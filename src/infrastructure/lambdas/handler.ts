import { APIGatewayProxyHandler } from "aws-lambda";
import { VehicleRepository } from "../database/SupabaseVehicleRepository";
import { CreateVehicle } from "../../application/use-cases/CreateVehicle";
import { VehicleMapper } from "../../application/mapper/VehicleMapper";
import { ValidationError } from "../../domain/entities/errors/ValidationError";


const vehicleRepository = new VehicleRepository();
const createVehicle = new CreateVehicle(vehicleRepository);
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

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: response,

      }),
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: error instanceof Error ? error.message : "An unknown error occurred" }),
    };
  }
};