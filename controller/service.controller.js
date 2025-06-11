import mongoose from "mongoose";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import { Service } from "../models/service.model.js";
import { io } from "../index.js";  

export const createService = async (req, res) => {
  try {
    const { title, description, iconName } = req.body;
    const serviceImage = req.files?.serviceImage?.[0];
    const iconImage = req.files?.iconImage?.[0];

    if (!title || !description || !serviceImage) {
      return res.status(400).json({
        message: "Title, description, and service image are required",
      });
    }

    // Generate unique slug
    let slug = slugify(title, { lower: true, strict: true });
    let count = 1;
    while (await Service.findOne({ slug })) {
      slug = slugify(`${title}-${count}`, { lower: true, strict: true });
      count++;
    }

    const iconImagePath = iconImage?.path.replace(/\\/g, "/").replace("public/", "") || null;
    const serviceImagePath = serviceImage.path.replace(/\\/g, "/").replace("public/", "");
    const createdBy = req.user?._id;

    const newService = await Service.create({
      title,
      slug,
      description,
      iconName: iconName || null,
      iconImage: iconImagePath,
      serviceImage: serviceImagePath,
      createdBy,
    });

    // Emit event for new service creation
    io.emit("service:created", newService);

    res.status(201).json({ message: "Service created", service: newService });
  } catch (error) {
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

    if (title) {
      updateData.title = title;
      updateData.slug = slugify(title, { lower: true, strict: true });
    }

    if (description !== undefined) updateData.description = description;
    if (iconName !== undefined) updateData.iconName = iconName;

    if (req.files?.iconImage?.[0]) {
      if (service.iconImage) {
        const oldIconPath = path.join("public", service.iconImage);
        if (fs.existsSync(oldIconPath)) fs.unlinkSync(oldIconPath);
      }
      updateData.iconImage = req.files.iconImage[0].path.replace(/\\/g, "/").replace("public/", "");
    }

    if (req.files?.serviceImage?.[0]) {
      if (service.serviceImage) {
        const oldServPath = path.join("public", service.serviceImage);
        if (fs.existsSync(oldServPath)) fs.unlinkSync(oldServPath);
      }
      updateData.serviceImage = req.files.serviceImage[0].path.replace(/\\/g, "/").replace("public/", "");
    }

    const updated = await Service.findByIdAndUpdate(id, updateData, { new: true });

    // Emit event for service update
    io.emit("service:updated", updated);

    res.status(200).json({ message: "Service updated", service: updated });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", details: error.message });
  }
};

export const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    if (service.iconImage) {
      const iconPath = path.join("public", service.iconImage);
      if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
    }

    if (service.serviceImage) {
      const servPath = path.join("public", service.serviceImage);
      if (fs.existsSync(servPath)) fs.unlinkSync(servPath);
    }

    await service.deleteOne();

    // Emit event for service deletion
    io.emit("service:deleted", id);

    res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting service", details: error.message });
  }
};

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ message: "Not found" });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getServiceBySlug = async (req, res) => {
  const { slug } = req.params;
  try {
    const service = await Service.findOne({ slug });
    if (!service) return res.status(404).json({ message: "Not found" });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};
