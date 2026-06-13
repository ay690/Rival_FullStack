import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import tasksRouter from "./routes/tasks.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/tasks", tasksRouter);

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err);
  const message = err instanceof Error ? err.message : "An unexpected error occurred";
  res.status(500).json({ error: message });
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});