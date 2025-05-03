import swaggerJsDoc from "swagger-jsdoc";

const isLocal = process.env.IS_OFFLINE === "true"; // Detectar si estás ejecutando localmente

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lambda Vehicle API",
      version: "1.0.0",
      description: "API documentation for Lambda Vehicle",
    },
    servers: [
      {
        url: isLocal
          ? "http://localhost:3000" // URL para desarrollo local
          : `https://${process.env.API_GATEWAY_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${process.env.STAGE}`, // URL para AWS
      },
    ],
  },
  apis: ["./src/infrastructure/lambdas/*.ts"], // Ruta a tus archivos con anotaciones Swagger
};

// Generar la especificación de Swagger
export const swaggerSpec = swaggerJsDoc(swaggerOptions);