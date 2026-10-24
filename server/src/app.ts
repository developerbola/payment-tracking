import express from "express";
import cors from "cors";
import studentsRouter from "./routes/students.js";
import debtorsRouter from "./routes/debtors.js";
import groupsRouter from "./routes/groups.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", debtorsRouter);
app.use("/", studentsRouter);
app.use("/", groupsRouter);

// Unexpected errors return a clean 500 instead of an HTML stack trace.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;
