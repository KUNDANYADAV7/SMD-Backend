import { TrustedClient } from "../models/trustedClient.model.js";
import fs from "fs";
import path from "path";
import { io } from "../index.js";
import { cache } from "../middleware/cache.js";

export const createTrustedClient = async (req, res) => {
  try {
    const { category, title, description } = req.body;

    if (!category || !title || !description || !req.file) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const imagePath = req.file.path.replace(/\\/g, "/").replace("public/", "");

    const client = await TrustedClient.create({
      category,
      title,
      description,
      image: imagePath,
    });

    io.emit("trustedClient:created", client);

    // ✅ Clear related cache
    cache.del("allTrustedClients");
    cache.del("trustedClientCategoryCounts");

    res.status(201).json({ message: "Trusted client created", client });
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getAllTrustedClients = async (req, res) => {
  try {
    const cached = cache.get("allTrustedClients");
    if (cached) return res.status(200).json(cached);

    const clients = await TrustedClient.find().sort({ createdAt: -1 });
    cache.set("allTrustedClients", clients);

    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const updateTrustedClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await TrustedClient.findById(id);
    if (!client) return res.status(404).json({ message: "Trusted client not found" });

    const updateData = {};

    if (req.body.category) updateData.category = req.body.category;
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;

    if (req.file) {
      if (client.image) {
        const oldImagePath = path.join("public", client.image);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      updateData.image = req.file.path.replace(/\\/g, "/").replace("public/", "");
    }

    const updatedClient = await TrustedClient.findByIdAndUpdate(id, updateData, { new: true });

    io.emit("trustedClient:updated", updatedClient);

    // ✅ Clear related cache
    cache.del("allTrustedClients");
    cache.del("trustedClientCategoryCounts");
    cache.del(`trustedClient:${id}`);

    res.status(200).json({ message: "Trusted client updated", updatedClient });
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const deleteTrustedClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await TrustedClient.findById(id);
    if (!client) return res.status(404).json({ message: "Trusted client not found" });

    if (client.image) {
      const imgPath = path.join("public", client.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await client.deleteOne();

    io.emit("trustedClient:deleted", id);

    // ✅ Clear related cache
    cache.del("allTrustedClients");
    cache.del("trustedClientCategoryCounts");
    cache.del(`trustedClient:${id}`);

    res.status(200).json({ message: "Trusted client deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getTrustedClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const cached = cache.get(`trustedClient:${id}`);
    if (cached) return res.status(200).json(cached);

    const client = await TrustedClient.findById(id);
    if (!client) {
      return res.status(404).json({ message: "Trusted client not found" });
    }

    cache.set(`trustedClient:${id}`, client);

    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getTrustedClientCategoryCounts = async (req, res) => {
  try {
    const cached = cache.get("trustedClientCategoryCounts");
    if (cached) return res.status(200).json(cached);

    const counts = await TrustedClient.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    cache.set("trustedClientCategoryCounts", counts);

    res.status(200).json(counts);
  } catch (error) {
    console.error("Error getting trusted client category counts:", error);
    res.status(500).json({ message: "Failed to get category counts", details: error.message });
  }
};
