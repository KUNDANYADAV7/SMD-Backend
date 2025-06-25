import mongoose from "mongoose";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import { Service } from "../models/service.model.js";
import { io } from "../index.js";  
import { cache } from "../middleware/cache.js";
import { fileURLToPath } from "url";




const __filename = fileURLToPath(import.meta.url);  // ✅ Define for ES module
const __dirname = path.dirname(__filename);         // ✅ Now __dirname is available

const cleanPath = (filePath) =>
  filePath?.replace(/\\/g, "/").replace("public/", "") || "";

const removeOldFile = (filePath) => {
  try {
    const cleanedPath = cleanPath(filePath);
    const fullPath = path.join(__dirname, "../public", cleanedPath);
    if (cleanedPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error("❌ Failed to remove file:", error.message);
  }
};


export const createService = async (req, res) => {
  try {
    const { title, description, iconName } = req.body;
    const serviceImage = req.files?.serviceImage?.[0];
    const iconImage = req.files?.iconImage?.[0];

    if (!title || !description || !serviceImage) {
      return res.status(400).json({ message: "Title, description, and service image are required" });
    }

    const createdBy = req.user?._id;
    const iconImagePath = cleanPath(iconImage?.path);
    const serviceImagePath = cleanPath(serviceImage.path);

    const steps = [];
    for (let i = 1; i <= 4; i++) {
      const stepTitle = req.body[`step${i}Title`] || "";
      const stepDescription = req.body[`step${i}Description`] || "";
      const stepFile = req.files?.[`step${i}Image`]?.[0];
      const stepImage = cleanPath(stepFile?.path);
      if (stepTitle || stepDescription || stepImage) {
        steps.push({ stepTitle, stepDescription, stepImage });
      }
    }

    res.status(202).json({
      message: "Service is being created",
      preview: { title, description, iconImagePath, serviceImagePath, stepsLength: steps.length },
    });

    (async () => {
      try {
        const baseSlug = slugify(title, { lower: true, strict: true });
        const slugRegex = new RegExp(`^${baseSlug}(-\\d+)?$`);
        const existingSlugs = await Service.find({ slug: slugRegex }).select("slug");

        let slug = baseSlug;
        if (existingSlugs.length > 0) {
          const counts = existingSlugs.map((s) => parseInt(s.slug.split("-").pop()) || 0).filter((n) => !isNaN(n));
          slug = `${baseSlug}-${Math.max(...counts, 0) + 1}`;
        }

        const newService = await Service.create({
          title,
          slug,
          description,
          iconName: iconName || null,
          iconImage: iconImagePath,
          serviceImage: serviceImagePath,
          steps,
          createdBy,
        });

        cache.del("all-services"); // ✅ clear cache after creation
        io.emit("service:created", newService);
      } catch (e) {
        console.error("Async createService error:", e.message);
      }
    })();
  } catch (error) {
    console.error("Immediate createService error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, iconName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    const updateData = {};

    if (title && title !== service.title) {
      updateData.title = title;
      const baseSlug = slugify(title, { lower: true, strict: true });
      const slugRegex = new RegExp(`^${baseSlug}(-\\d+)?$`);
      const existingSlugs = await Service.find({ slug: slugRegex, _id: { $ne: id } }).select("slug");

      let slug = baseSlug;
      if (existingSlugs.length > 0) {
        const counts = existingSlugs.map((s) => parseInt(s.slug.split("-").pop()) || 0).filter((n) => !isNaN(n));
        slug = `${baseSlug}-${Math.max(...counts, 0) + 1}`;
      }

      updateData.slug = slug;
    }

    if (description !== undefined) updateData.description = description;
    if (iconName !== undefined) updateData.iconName = iconName;

    if (req.files?.iconImage?.[0]) {
      removeOldFile(service.iconImage);
      updateData.iconImage = cleanPath(req.files.iconImage[0].path);
    }

    if (req.files?.serviceImage?.[0]) {
      removeOldFile(service.serviceImage);
      updateData.serviceImage = cleanPath(req.files.serviceImage[0].path);
    }

    const updatedSteps = [];
    for (let i = 1; i <= 4; i++) {
      const stepTitle = req.body[`step${i}Title`] || "";
      const stepDescription = req.body[`step${i}Description`] || "";
      const newStepFile = req.files?.[`step${i}Image`]?.[0];

      let stepImage = service.steps?.[i - 1]?.stepImage || "";
      if (newStepFile) {
        if (stepImage) removeOldFile(stepImage);
        stepImage = cleanPath(newStepFile.path);
      }

      if (stepTitle || stepDescription || stepImage) {
        updatedSteps.push({ stepTitle, stepDescription, stepImage });
      }
    }

    updateData.steps = updatedSteps;

    const updatedService = await Service.findByIdAndUpdate(id, updateData, { new: true });

    cache.del("all-services"); // ✅ clear cache after update
    io.emit("service:updated", updatedService);

    res.status(200).json({ message: "Service updated", service: updatedService });
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).json({ message: "Internal server error", details: error.message });
  }
};

export const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    removeOldFile(service.iconImage);
    removeOldFile(service.serviceImage);
    if (Array.isArray(service.steps)) {
      for (const step of service.steps) {
        if (step.stepImage) removeOldFile(step.stepImage);
      }
    }

    await service.deleteOne();

    cache.del("all-services"); // ✅ clear cache after delete
    io.emit("service:deleted", id);
    res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting service", details: error.message });
  }
};



export const getAllServices = async (req, res) => {
  try {
    const cacheKey = "all-services";

    // 1. Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // 2. If not cached, fetch from DB
    const services = await Service.find().sort({ createdAt: -1 }).lean();

    // 3. Store result in cache
    cache.set(cacheKey, services);

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};



export const getServiceById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `service-by-id:${id}`;
  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    // Fetch from DB if not in cache
    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ message: "Not found" });

    cache.set(cacheKey, service); // Store in cache
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getServiceBySlug = async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `service-by-slug:${slug}`;
  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    // Fetch from DB if not in cache
    const service = await Service.findOne({ slug });
    if (!service) return res.status(404).json({ message: "Not found" });

    cache.set(cacheKey, service); // Store in cache
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

