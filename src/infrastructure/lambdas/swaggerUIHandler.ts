import { APIGatewayProxyHandler } from "aws-lambda";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
import { createServer, proxy } from "aws-serverless-express";
import express from "express";

const app = express();

// Configuración de Swagger
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
        url: `https://${process.env.API_GATEWAY_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${process.env.STAGE}`,
      },
    ],
  },
  apis: ["./src/infrastructure/lambdas/*.ts"],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

app.use("/swagger-ui", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const server = createServer(app);

export const handler: APIGatewayProxyHandler = (event, context) => {
  return proxy(server, event, context);
};
