import { APIGatewayProxyHandler } from "aws-lambda";
import { VehicleRepository } from "../database/SupabaseVehicleRepository";
import { CreateVehicle } from "../../application/use-cases/CreateVehicle";
import { GetAllVehicles } from "../../application/use-cases/GetAllVehicles";
import { DetailVehicle } from "../../application/use-cases/DetailVehicle";
import { UpdateVehicle } from "../../application/use-cases/UpdateVehicle";
import { VehicleMapper } from "../../application/mapper/VehicleMapper";
import { ValidationError } from "../../domain/entities/errors/ValidationError";
import { corsResponse } from "./CorsResponse";
import { UploadImagesRepository } from "../google/UploadImagesRepository";
import { GetImages } from "../../application/use-cases/GetImages";
import { DownloadImagesFromFolder } from "../google/DownloadImagesFromFolder";
import { DocumentHttpRepository } from "../api/DocumentHttpRepository";
import { DebtHttpRepository } from "../api/DebtHttpRepository";
import { DocumentSupabaseRepository } from "../database/DocumentSupabaseRepository";
import { DebtSupabaseRepository } from "../database/DebtSupabaseRepository";

const vehicleRepository = new VehicleRepository();
const downloadAllImagesFromFolder = new DownloadImagesFromFolder();

const uploadImagesRepository = new UploadImagesRepository();
const documentRepository = new DocumentHttpRepository();



const documentRepositoryDb = new DocumentSupabaseRepository();
const debtRepositoryDb = new DebtSupabaseRepository();


const debtRepository = new DebtHttpRepository();
const createVehicle = new CreateVehicle(
  vehicleRepository,
  uploadImagesRepository,
  documentRepository,
  debtRepository
);

const getAllVehicles = new GetAllVehicles(
  vehicleRepository,
  documentRepositoryDb, // Este debe ser DocumentSupabaseRepository
  debtRepositoryDb     // Este debe ser DebtSupabaseRepository
);
const detailVehicle = new DetailVehicle(vehicleRepository);
const updateVehicle = new UpdateVehicle(vehicleRepository,documentRepository, debtRepository);

const getImages = new GetImages(downloadAllImagesFromFolder);

export const getImageFromVehicleHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const fileUrl = event.queryStringParameters?.id;
    if (!fileUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "File URL is required" }),
      };
    }

    // Suponiendo que tu método también retorna mimeType:
    const image = await getImages.execute(fileUrl); // { name, buffer, mimeType }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": image.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${image.name}"`,
      },
      body: image.buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error instanceof Error ? error.message : "An unknown error occurred",
      }),
    };
  }
};

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
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
};

/**
 * @swagger
 * /vehicle/{id}:
 *   put:
 *     summary: Update a vehicle by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the vehicle to update
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
 *               version:
 *                 type: string
 *               transmission:
 *                 type: string
 *               traction:
 *                 type: string
 *               fuel_type:
 *                 type: string
 *               kms:
 *                 type: number
 *               model:
 *                 type: string
 *                 format: date
 *               displacement:
 *                 type: number
 *               seat_material:
 *                 type: string
 *               airbags:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Internal server error
 */
export const updateVehicleHandler: APIGatewayProxyHandler = async (event) => {
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

    // First check if the vehicle exists
    const existingVehicle = await vehicleRepository.findById(id);
    if (!existingVehicle) {
      return corsResponse(404, {
        error: {
          code: "VEHICLE_NOT_FOUND",
          message: `Vehicle with ID ${id} not found`,
        },
      });
    }

    const body = JSON.parse(event.body || "{}");
    
    // Validate that at least one field is being updated
    if (Object.keys(body).length === 0) {
      return corsResponse(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "No update data provided",
        },
      });
    }

    // List of valid vehicle fields
    const validFields = [
      'type',
      'brand',
      'line',
      'version',
      'transmission',
      'traction',
      'fuelType',
      'kms',
      'model',
      'displacement',
      'seatMaterial',
      'airbags',
      'images',
      'plate',
      'documents',
      'debts'
    ];

    // Check for invalid fields
    const invalidFields = Object.keys(body).filter(field => !validFields.includes(field));
    if (invalidFields.length > 0) {
      return corsResponse(400, {
        error: {
          code: "INVALID_FIELDS",
          message: "Invalid fields provided",
          details: invalidFields.map(field => ({
            field,
            message: `Field '${field}' is not a valid vehicle field`
          }))
        }
      });
    }

    // Transform the data to match the mapper's expected format
    const transformedBody = {
      ...body,
      fuelType: body.fuel_type || existingVehicle.fuel_type,
      seatMaterial: body.seat_material || existingVehicle.seat_material,
    };

    // Merge existing vehicle data with update data
    const updateData = {
      ...existingVehicle,
      ...transformedBody,
      // Ensure required fields are present from existing vehicle
      type: body.type || existingVehicle.type,
      brand: body.brand || existingVehicle.brand,
      line: body.line || existingVehicle.line,
      fuel_type: body.fuel_type || existingVehicle.fuel_type,
      kms: body.kms ?? existingVehicle.kms,
      model: body.model || existingVehicle.model,
    };

    delete updateData.images; // Remove images from the update data if it exists

    const vehicleData = VehicleMapper.toDomain(updateData);
    const updatedVehicle = await updateVehicle.execute(id, vehicleData);
    return corsResponse(200, updatedVehicle);
  } catch (error) {
    if (error instanceof ValidationError) {
      return corsResponse(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          details: error.details,
        },
      });
    }

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
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
};
