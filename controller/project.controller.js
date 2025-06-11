import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import { io } from "../index.js";


export const createProject = async (req, res) => {
  try {
    const {
      title,
      category,
      description = "",
      mapUrl = "",
      status,
      address = "",
      architect = "SMD Engineer",
    } = req.body;

    if (!title || !category || !status) {
      return res.status(400).json({ message: "Title, category, and status are required." });
    }

    const createdBy = req.user?._id;

    // Validate main image
    const mainImage = req.files?.image?.[0];
    if (!mainImage) {
      return res.status(400).json({ message: "Main project image is required." });
    }

    // Validate additional images
    const additionalImages = req.files?.additionalImages || [];
    if (additionalImages.length > 3) {
      return res.status(400).json({ message: "You can upload up to 3 additional images only." });
    }

    // Generate unique slug
    let slug = slugify(title, { lower: true, strict: true });
    let count = 1;
    while (await Project.findOne({ slug })) {
      slug = slugify(`${title}-${count}`, { lower: true, strict: true });
      count++;
    }

    const formatPath = (file) => file.path.replace(/\\/g, "/").replace("public/", "");
    const image = formatPath(mainImage);
    const additionalImagePaths = additionalImages.map(formatPath);

    const project = await Project.create({
      title,
      slug,
      category,
      description,
      mapUrl,
      image,
      additionalImages: additionalImagePaths,
      status,
      address,
      architect,
      createdBy,
    });

    io.emit("projectCreated", project);

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    console.error(" Error creating project:", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete images
    if (project.image) {
      const mainPath = path.join("public", project.image);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
    }

    if (project.additionalImages && project.additionalImages.length > 0) {
      project.additionalImages.forEach((img) => {
        const imgPath = path.join("public", img);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      });
    }

    await project.deleteOne();
    io.emit("projectDeleted", { id });

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(" Error deleting project:", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      mapUrl: req.body.mapUrl,
      status: req.body.status,
      address: req.body.address || "",
      architect: req.body.architect || "SMD Engineer",
    };

    // Handle main image update
    const mainImageFile = req.files?.image?.[0];
    if (mainImageFile) {
      if (project.image) {
        const oldImagePath = path.join("public", project.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = mainImageFile.path.replace(/\\/g, "/").replace("public/", "");
    }

    // Handle additional images
    if ("existingAdditionalImages" in req.body) {
      let keepImages = [];
      if (Array.isArray(req.body.existingAdditionalImages)) {
        keepImages = req.body.existingAdditionalImages;
      } else if (req.body.existingAdditionalImages) {
        keepImages = [req.body.existingAdditionalImages];
      }

      project.additionalImages.forEach((img) => {
        if (!keepImages.includes(img)) {
          const imgPath = path.join("public", img);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      });

      updateData.additionalImages = [...keepImages];

      if (req.files?.additionalImages?.length > 0) {
        const newImages = req.files.additionalImages.map(file =>
          file.path.replace(/\\/g, "/").replace("public/", "")
        );
        updateData.additionalImages.push(...newImages);
      }
    } else {
      // No existingAdditionalImages: remove all
      if (project.additionalImages?.length > 0) {
        project.additionalImages.forEach((img) => {
          const imgPath = path.join("public", img);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        });
      }

      updateData.additionalImages = req.files?.additionalImages?.map(file =>
        file.path.replace(/\\/g, "/").replace("public/", "")
      ) || [];
    }

    await Project.findByIdAndUpdate(projectId, updateData);
    io.emit("projectUpdated", updateData);

    res.json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", details: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", details: error.message });
  }
};

export const getProjectBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findOne({ slug });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", details: error.message });
  }
};
