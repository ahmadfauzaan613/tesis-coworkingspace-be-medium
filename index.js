import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { AppError } from "./utils/AppError.js";
import db from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// CORS & BODY-PARSER MIDDLEWARES
// ==========================================
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);

app.use(express.json());

// Mount Swagger Documentation UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Master API Router
app.use("/api/v1", apiRouter);

// 404 Route Fallback
app.use((req, res, next) => {
  next(
    new AppError(
      `Requested URL (${req.originalUrl}) was not found on this server.`,
      404,
    ),
  );
});

// Central Global Exception Handler Middleware
app.use(errorHandler);

// Helper to check DB connection on boot
async function checkDbConnection() {
  try {
    await db.raw("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return false;
  }
}

// Start API Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(
    `🚀 CoSpace Inventory Server running at http://localhost:${PORT}`,
  );
  console.log(
    `📘 Swagger API Documentation at http://localhost:${PORT}/api-docs`,
  );
  console.log(`====================================================`);

  const connected = await checkDbConnection();
  if (connected) {
    console.log("✅ PostgreSQL Connection established.");
  } else {
    console.log("⚠️ Database connection could not be established.");
    console.log("💡 Configure POSTGRES_HOST credentials in Backend/.env.");
  }
});
