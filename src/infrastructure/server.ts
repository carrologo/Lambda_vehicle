import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger/swagger";

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/api-docs`
  );
});
