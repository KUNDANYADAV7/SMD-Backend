import express from "express";
import {
  createProject,
  updateProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  getProjectBySlug,
  getCategoryCounts
} from "../controller/project.controller.js";
import { isAuthenticated, isAdmin } from "../middleware/authUser.js";
import { upload, setUploadFolder } from "../middleware/Multer.js";

const router = express.Router();

router.post(
  "/create",
  isAuthenticated,
  isAdmin("admin"),
  setUploadFolder("projectImages"),
  upload.fields([
    { name: "image", maxCount: 1 },              // main image
    { name: "additionalImages", maxCount: 3 }    // up to 3 additional images
  ]),
  createProject
);

router.put(
  "/update/:id",
  isAuthenticated,
  isAdmin("admin"),
  setUploadFolder("projectImages"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "additionalImages", maxCount: 3 }
  ]),
  updateProject
);

router.delete("/delete/:id", isAuthenticated, isAdmin("admin"), deleteProject);

router.get("/all", getAllProjects);
router.get("/id/:id", getProjectById);
router.get("/slug/:slug", getProjectBySlug);
router.get("/category-counts", getCategoryCounts);

export default router;
