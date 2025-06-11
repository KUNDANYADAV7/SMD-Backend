import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import { Server } from "socket.io";
import http from "http"; // ✅ Needed for Socket.io

// Routes
import userRoute from "./routes/user.route.js";
import blogRoute from "./routes/blog.route.js";
import serviceRoute from "./routes/service.routes.js";
import projectRoute from "./routes/project.routes.js";
import trustedClientRoute from "./routes/trustedClient.route.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 4001;
const MONGO_URL = process.env.MONOG_URI;

// Create HTTP server
const server = http.createServer(app);

// ✅ Setup Socket.IO server
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URIS.split(","),
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ✅ Socket.IO connection listener
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = process.env.FRONTEND_URIS.split(",");
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static files
app.use(
  express.static("public", {
    maxAge: "1y",
    setHeaders: (res, path) => {
      if (
        path.endsWith(".jpg") ||
        path.endsWith(".jpeg") ||
        path.endsWith(".png") ||
        path.endsWith(".webp") ||
        path.endsWith(".gif") ||
        path.endsWith(".svg")
      ) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

// MongoDB connection
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// Routes
app.use("/api/users", userRoute);
app.use("/api/blogs", blogRoute);
app.use("/api/services", serviceRoute);
app.use("/api/projects", projectRoute);
app.use("/api/trustedClient", trustedClientRoute);

// Start the server
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
