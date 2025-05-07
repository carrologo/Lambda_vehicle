import { APIGatewayProxyHandler } from "aws-lambda";
import { VehicleRepository } from "../database/SupabaseVehicleRepository";
import { CreateVehicle } from "../../application/use-cases/CreateVehicle";
import { GetAllVehicles } from "../../application/use-cases/GetAllVehicles";
import { DetailVehicle } from "../../application/use-cases/DetailVehicle";
import { VehicleMapper } from "../../application/mapper/VehicleMapper";
import { ValidationError } from "../../domain/entities/errors/ValidationError";
import { corsResponse } from "./CorsResponse";
import { UploadImagesRepository } from "../google/UploadImagesRepository";

const vehicleRepository = new VehicleRepository();
const uploadImagesRepository = new UploadImagesRepository();
const createVehicle = new CreateVehicle(
  vehicleRepository,
  uploadImagesRepository
);
const getAllVehicles = new GetAllVehicles(vehicleRepository);
const detailVehicle = new DetailVehicle(vehicleRepository);
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

export const createVehicleHandler: APIGatewayProxyHandler = async (event) => {
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

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles
 *     parameters:
 *       - in: query
 *         name: findBy
 *         schema:
 *           type: string
 *         description: Field to filter vehicles by (e.g., brand, type).
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: Value to filter vehicles by.
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *         description: Field to order vehicles by.
 *       - in: query
 *         name: isAsc
 *         schema:
 *           type: boolean
 *         description: Whether to sort in ascending order (default: true).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of vehicles per page.
 *     responses:
 *       200:
 *         description: List of vehicles with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getAllVehiclesHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = {
      findBy: event.queryStringParameters?.findBy,
      value: event.queryStringParameters?.value,
      orderBy: event.queryStringParameters?.orderBy,
      isAsc: event.queryStringParameters?.isAsc === "false" ? false : true,
      page: event.queryStringParameters?.page
        ? parseInt(event.queryStringParameters.page, 10)
        : 1,
      limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit, 10)
        : 50,
    };

    const { data, pagination } = await getAllVehicles.execute(queryParams);
    return corsResponse(200, { data, pagination });
  } catch (error) {
    return corsResponse(500, {
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};

/**
 * @swagger
 * /vehicle/{id}:
 *   get:
 *     summary: Get vehicle details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the vehicle to retrieve
 *     responses:
 *       200:
 *         description: Vehicle details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Internal server error
 */
export const detailVehicleHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = parseInt(event.pathParameters?.id || "0", 10);
    
    
    if (isNaN(id) || id <= 0) {
      return corsResponse(400, {
        error: {
          code: "INVALID_ID",
          message: "Invalid vehicle ID provided",
        },
      });
    }

    const vehicle = await detailVehicle.execute(id);
    return corsResponse(200, vehicle);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return corsResponse(404, {
        error: {
          code: "VEHICLE_NOT_FOUND",
          message: error.message,
        },
      });
    }

    return corsResponse(500, {
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
};
