import express from "express";
import {
  createTrustedClient,
  getAllTrustedClients,
  updateTrustedClient,
  deleteTrustedClient,
  getTrustedClientById
} from "../controller/trustedClient.controller.js";
import { isAuthenticated, isAdmin } from "../middleware/authUser.js";
import { upload, setUploadFolder } from "../middleware/Multer.js";

const router = express.Router();

router.post(
  "/create",
  isAuthenticated,
  isAdmin("admin"),
  setUploadFolder("trustedClients"),
  upload.single("image"),
  createTrustedClient
);

router.get("/all", getAllTrustedClients);

router.get("/:id", getTrustedClientById);

router.put(
  "/update/:id",
  isAuthenticated,
  isAdmin("admin"),
  setUploadFolder("trustedClients"),
  upload.single("image"),
  updateTrustedClient
);

router.delete(
  "/delete/:id",
  isAuthenticated,
  isAdmin("admin"),
  deleteTrustedClient
);

export default router;
