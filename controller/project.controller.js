import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import { io } from "../index.js";
import { cache } from "../middleware/cache.js";

// ✅ Helper
const formatPath = (file) => file.path.replace(/\\/g, "/").replace("public/", "");

// 🚀 CREATE PROJECT
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
    const mainImage = req.files?.image?.[0];
    if (!mainImage) return res.status(400).json({ message: "Main project image is required." });

    const additionalImages = req.files?.additionalImages || [];
    if (additionalImages.length > 3) {
      return res.status(400).json({ message: "You can upload up to 3 additional images only." });
    }

    let slug = slugify(title, { lower: true, strict: true });
    let count = 1;
    while (await Project.findOne({ slug })) {
      slug = slugify(`${title}-${count}`, { lower: true, strict: true });
      count++;
    }

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

    // ✅ Invalidate cache
    cache.del("allProjects");
    cache.del("categoryCounts");

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

// 🚀 DELETE PROJECT
export const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.image) {
      const mainPath = path.join("public", project.image);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
    }

    project.additionalImages?.forEach((img) => {
      const imgPath = path.join("public", img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });

    await project.deleteOne();
    io.emit("projectDeleted", { id });

    // ✅ Invalidate cache
    cache.del("allProjects");
    cache.del("categoryCounts");
    cache.del(`project:${id}`);
    cache.del(`projectSlug:${project.slug}`);

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

// 🚀 UPDATE PROJECT
export const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      mapUrl: req.body.mapUrl,
      status: req.body.status,
      address: req.body.address || "",
      architect: req.body.architect || "SMD Engineer",
    };

    const mainImageFile = req.files?.image?.[0];
    if (mainImageFile) {
      if (project.image) {
        const oldImagePath = path.join("public", project.image);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      updateData.image = formatPath(mainImageFile);
    }

    if ("existingAdditionalImages" in req.body) {
      let keepImages = Array.isArray(req.body.existingAdditionalImages)
        ? req.body.existingAdditionalImages
        : [req.body.existingAdditionalImages];

      project.additionalImages.forEach((img) => {
        if (!keepImages.includes(img)) {
          const imgPath = path.join("public", img);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      });

      updateData.additionalImages = [...keepImages];

      if (req.files?.additionalImages?.length > 0) {
        const newImages = req.files.additionalImages.map(formatPath);
        updateData.additionalImages.push(...newImages);
      }
    } else {
      project.additionalImages?.forEach((img) => {
        const imgPath = path.join("public", img);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      });

      updateData.additionalImages = req.files?.additionalImages?.map(formatPath) || [];
    }

    await Project.findByIdAndUpdate(projectId, updateData);
    io.emit("projectUpdated", updateData);

    // ✅ Invalidate cache
    cache.del("allProjects");
    cache.del("categoryCounts");
    cache.del(`project:${projectId}`);
    cache.del(`projectSlug:${project.slug}`);

    res.json({ message: "Project updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET (CACHED)
export const getAllProjects = async (req, res) => {
  try {
    const cached = cache.get("allProjects");
    if (cached) return res.status(200).json(cached);

    // const projects = await Project.find();
      const projects = await Project.find().lean();
    cache.set("allProjects", projects);
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", details: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const cached = cache.get(`project:${id}`);
    if (cached) return res.status(200).json(cached);

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    cache.set(`project:${id}`, project);
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", details: error.message });
  }
};

export const getProjectBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const cached = cache.get(`projectSlug:${slug}`);
    if (cached) return res.status(200).json(cached);

    const project = await Project.findOne({ slug });
    if (!project) return res.status(404).json({ message: "Project not found" });

    cache.set(`projectSlug:${slug}`, project);
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", details: error.message });
  }
};

export const getCategoryCounts = async (req, res) => {
  try {
    const cached = cache.get("categoryCounts");
    if (cached) return res.status(200).json(cached);

    const counts = await Project.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { category: "$_id", count: 1, _id: 0 } },
    ]);

    cache.set("categoryCounts", counts);
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: "Failed to get category counts", details: error.message });
  }
};
