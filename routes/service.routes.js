import express from "express";
import {
  createService,
  updateService,
  deleteService,
  getAllServices,
  getServiceById,
  getServiceBySlug,
} from "../controller/service.controller.js";
import { isAuthenticated, isAdmin } from "../middleware/authUser.js";
import { upload, setUploadFolder } from "../middleware/Multer.js";

const router = express.Router();

router.post(
  "/create",
  isAuthenticated,
  isAdmin("admin"),
  setUploadFolder("serviceImages"),
  upload.fields([
    { name: "iconImage", maxCount: 1 },
    { name: "serviceImage", maxCount: 1 },
  ]),
  createService
);

router.put(
  "/update/:id",
  isAuthenticated,
  isAdmin("admin"),
  setUploadFolder("serviceImages"),
  upload.fields([
    { name: "iconImage", maxCount: 1 },
    { name: "serviceImage", maxCount: 1 },
  ]),
  updateService
);

router.delete("/delete/:id", isAuthenticated, isAdmin("admin"), deleteService);

router.get("/all", getAllServices);
router.get("/id/:id", getServiceById);
router.get("/slug/:slug", getServiceBySlug);

export default router;
