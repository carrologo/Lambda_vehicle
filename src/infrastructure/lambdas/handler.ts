import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
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
import { DocumentSupabaseRepository } from "../database/DocumentSupabaseRepository";
import { DebtSupabaseRepository } from "../database/DebtSupabaseRepository";
import { DebtHttpRepository } from "../api/DebtHttpRepository";
import { DocumentHttpRepository } from "../api/DocumentHttpRepository";

// Initialize repositories and use cases
const vehicleRepository = new VehicleRepository();
const downloadAllImagesFromFolder = new DownloadImagesFromFolder();
const uploadImagesRepository = new UploadImagesRepository();

// Use database repositories instead of HTTP repositories
const documentRepositoryDb = new DocumentSupabaseRepository();
const debtRepositoryDb = new DebtSupabaseRepository();

const documentRepositoryHttp = new DocumentHttpRepository();
const debtRepositoryHttp = new DebtHttpRepository();

// Initialize use cases with proper repository injection
const createVehicle = new CreateVehicle(
  vehicleRepository,
  uploadImagesRepository,
  documentRepositoryDb, // Use database repository for consistency
  debtRepositoryDb // Use database repository for consistency
);

const getAllVehicles = new GetAllVehicles(
  vehicleRepository,
  documentRepositoryDb,
  debtRepositoryDb
);

const detailVehicle = new DetailVehicle(
  vehicleRepository,
  documentRepositoryDb,
  debtRepositoryDb
);

const updateVehicle = new UpdateVehicle(
  vehicleRepository,
  documentRepositoryHttp, // Use database repository for consistency
  debtRepositoryHttp // Use database repository for consistency
);

const getImages = new GetImages(downloadAllImagesFromFolder);

// Main handler that routes all requests
export const main: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const {
      httpMethod,
      resource,
      pathParameters,
      queryStringParameters,
      body,
    } = event;

    // Route based on method and path
    switch (httpMethod) {
      case "POST":
        if (resource === "/vehicle") {
          return await handleCreateVehicle(body);
        }
        break;

      case "GET":
        if (resource === "/vehicles") {
          return await handleGetAllVehicles(queryStringParameters);
        }
        if (resource === "/vehicles/{id}") {
          return await handleDetailVehicle(pathParameters?.id);
        }
        if (resource === "/image") {
          return await handleGetImage(queryStringParameters?.id);
        }
        break;

      case "PATCH":
        if (resource === "/vehicles/{id}") {
          return await handleUpdateVehicle(pathParameters?.id, body);
        }
        break;

      default:
        return corsResponse(405, {
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: `Method ${httpMethod} not allowed for resource ${resource}`,
          },
        });
    }

    return corsResponse(404, {
      error: {
        code: "NOT_FOUND",
        message: `Resource ${resource} not found`,
      },
    });
  } catch (error) {
    console.error("Unhandled error in main handler:", error);
    return corsResponse(500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
};

// Handler functions for each endpoint
async function handleCreateVehicle(
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    const parsedBody = JSON.parse(body || "{}");
    const response = await createVehicle.execute(
      VehicleMapper.toDomain(parsedBody)
    );
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
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
}

async function handleGetAllVehicles(
  queryStringParameters: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = {
      findBy: queryStringParameters?.findBy,
      value: queryStringParameters?.value,
      orderBy: queryStringParameters?.orderBy,
      isAsc: queryStringParameters?.isAsc !== "false",
      page: queryStringParameters?.page
        ? parseInt(queryStringParameters.page, 10)
        : 1,
      limit: queryStringParameters?.limit
        ? parseInt(queryStringParameters.limit, 10)
        : 50,
    };

    const { data, pagination } = await getAllVehicles.execute(queryParams);
    return corsResponse(200, { data, pagination });
  } catch (error) {
    return corsResponse(500, {
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
}

async function handleDetailVehicle(
  id: string | undefined
): Promise<APIGatewayProxyResult> {
  try {
    const vehicleId = parseInt(id || "0", 10);

    if (isNaN(vehicleId) || vehicleId <= 0) {
      return corsResponse(400, {
        error: {
          code: "INVALID_ID",
          message: "Invalid vehicle ID provided",
        },
      });
    }

    const vehicle = await detailVehicle.execute(vehicleId);
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
}

async function handleUpdateVehicle(
  id: string | undefined,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    const vehicleId = parseInt(id || "0", 10);

    if (isNaN(vehicleId) || vehicleId <= 0) {
      return corsResponse(400, {
        error: {
          code: "INVALID_ID",
          message: "Invalid vehicle ID provided",
        },
      });
    }

    // First check if the vehicle exists
    const existingVehicle = await vehicleRepository.findById(vehicleId);
    if (!existingVehicle) {
      return corsResponse(404, {
        error: {
          code: "VEHICLE_NOT_FOUND",
          message: `Vehicle with ID ${vehicleId} not found`,
        },
      });
    }

    const parsedBody = JSON.parse(body || "{}");

    // Validate that at least one field is being updated
    if (Object.keys(parsedBody).length === 0) {
      return corsResponse(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "No update data provided",
        },
      });
    }

    // List of valid vehicle fields
    const validFields = [
      "type",
      "brand",
      "line",
      "version",
      "transmission",
      "traction",
      "fuelType",
      "kms",
      "model",
      "displacement",
      "seatMaterial",
      "airbags",
      "images",
      "plate",
      "documents",
      "debts",
    ];

    // Check for invalid fields
    const invalidFields = Object.keys(parsedBody).filter(
      (field) => !validFields.includes(field)
    );
    if (invalidFields.length > 0) {
      return corsResponse(400, {
        error: {
          code: "INVALID_FIELDS",
          message: "Invalid fields provided",
          details: invalidFields.map((field) => ({
            field,
            message: `Field '${field}' is not a valid vehicle field`,
          })),
        },
      });
    }

    // Transform the data to match the mapper's expected format
    const transformedBody = {
      ...parsedBody,
      fuelType: parsedBody.fuel_type || existingVehicle.fuel_type,
      seatMaterial: parsedBody.seat_material || existingVehicle.seat_material,
    };

    // Merge existing vehicle data with update data
    const updateData = {
      ...existingVehicle,
      ...transformedBody,
      // Ensure required fields are present from existing vehicle
      type: parsedBody.type || existingVehicle.type,
      brand: parsedBody.brand || existingVehicle.brand,
      line: parsedBody.line || existingVehicle.line,
      fuel_type: parsedBody.fuel_type || existingVehicle.fuel_type,
      kms: parsedBody.kms ?? existingVehicle.kms,
      model: parsedBody.model || existingVehicle.model,
    };

    delete updateData.images; // Remove images from the update data if it exists

    const vehicleData = VehicleMapper.toDomain(updateData);
    const updatedVehicle = await updateVehicle.execute(vehicleId, vehicleData);
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
}

async function handleGetImage(
  fileUrl: string | undefined
): Promise<APIGatewayProxyResult> {
  try {
    if (!fileUrl) {
      return corsResponse(400, {
        error: {
          code: "MISSING_PARAMETER",
          message: "File URL is required",
        },
      });
    }

    const image = await getImages.execute(fileUrl);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": image.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${image.name}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PATCH",
      },
      body: image.buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return corsResponse(500, {
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
}
