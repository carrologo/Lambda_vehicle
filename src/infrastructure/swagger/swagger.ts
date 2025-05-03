import swaggerJsDoc from "swagger-jsdoc";

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
        url: "http://localhost:3001", // Cambia esto si usas un entorno de desarrollo en AWS
      },
    ],
  },
  apis: ["./src/infrastructure/lambdas/*.ts"], // Ruta a tus archivos con anotaciones Swagger
};

// Generar la especificación de Swagger
export const swaggerSpec = swaggerJsDoc(swaggerOptions);