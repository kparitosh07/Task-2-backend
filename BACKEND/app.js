import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import authRoutes from "./routes/auth.routes.js";

const app = express();

const __dirname = dirname(
    fileURLToPath(import.meta.url)
);

app.use(express.json());

app.use(
    express.static(
        join(__dirname, "../FRONTEND")
    )
);

app.use("/api", authRoutes);

app.get("/", (req, res) => {
    res.sendFile(
        join(__dirname, "../FRONTEND/index.html")
    );
});

export default app;