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
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    });
  }
}

export const getAllVehiclesHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const requestParams = {
      findBy: queryParams?.findBy,
      value: queryParams?.value,
      orderBy: queryParams?.orderBy,
      isAsc: queryParams?.isAsc !== "false",
      page: queryParams?.page ? parseInt(queryParams.page, 10) : 1,
      limit: queryParams?.limit ? parseInt(queryParams.limit, 10) : 50,
    };

    if (requestParams.page < 1) {
      return corsResponse(400, {
        error: {
          code: "BadRequest",
          message: "Page number must be greater than 0."
        }
      });
    }

    const { data, pagination } = await getAllVehicles.execute(requestParams);
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

export const getDetailVehicleHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters && event.pathParameters.id ? parseInt(event.pathParameters.id, 10) : null;
    if (!id || isNaN(id)) {
      return corsResponse(400, { error: { code: "INVALID_ID", message: "Invalid vehicle ID provided." } });
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
}

export const getImageVehicleHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const fileUrl = event.queryStringParameters?.id;
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

export const updateVehicleHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const vehicleId = event.pathParameters && event.pathParameters.id ? parseInt(event.pathParameters.id, 10) : null;

    if (!vehicleId || isNaN(vehicleId)) {
      return corsResponse(400, { error: { code: "BadRequest", message: "Invalid or missing vehicle ID." } });
    }

    const existingVehicle = await vehicleRepository.findById(vehicleId);
    if (!existingVehicle) {
      return corsResponse(404, {
        error: {
          code: "VEHICLE_NOT_FOUND",
          message: `Vehicle with ID ${vehicleId} not found`,
        },
      });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const parsedBody = JSON.parse(body || "{}");

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

    // Merge existing vehicle data with update data, transforming API format to mapper format
    const updateData = {
      ...existingVehicle,
      // Basic fields (direct mapping)
      type: parsedBody.type || existingVehicle.type,
      brand: parsedBody.brand || existingVehicle.brand,
      line: parsedBody.line || existingVehicle.line,
      kms: parsedBody.kms ?? existingVehicle.kms,
      model: parsedBody.model || existingVehicle.model,

      // Optional fields that can come from API
      version: parsedBody.version || existingVehicle.version,
      transmission: parsedBody.transmission || existingVehicle.transmission,
      traction: parsedBody.traction || existingVehicle.traction,
      displacement: parsedBody.displacement || existingVehicle.displacement,
      airbags: parsedBody.airbags ?? existingVehicle.airbags,
      plate: parsedBody.plate || existingVehicle.plate,

      // Transform snake_case from API to camelCase for VehicleMapper
      fuelType: parsedBody.fuel_type || existingVehicle.fuel_type,
      seatMaterial: parsedBody.seat_material || existingVehicle.seat_material,

      // Preserve other fields from parsedBody if they exist
      ...Object.fromEntries(
        Object.entries(parsedBody).filter(
          ([key]) =>
            ![
              "fuel_type",
              "seat_material",
              "type",
              "brand",
              "line",
              "kms",
              "model",
              "version",
              "transmission",
              "traction",
              "displacement",
              "airbags",
              "plate",
            ].includes(key)
        )
      ),
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
