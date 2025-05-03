import { APIGatewayProxyHandler } from "aws-lambda";
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
        url: `https://${process.env.API_GATEWAY_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${process.env.STAGE}`,
      },
    ],
  },
  apis: ["./src/infrastructure/lambdas/*.ts"],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

export const handler: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(swaggerSpec),
  };
};