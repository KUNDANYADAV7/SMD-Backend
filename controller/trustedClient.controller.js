import { TrustedClient } from "../models/trustedClient.model.js";
import fs from "fs";
import path from "path";
import { io } from "../index.js"; 

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

    // Emit real-time event on creation
    io.emit("trustedClient:created", client);

    res.status(201).json({ message: "Trusted client created", client });
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getAllTrustedClients = async (req, res) => {
  try {
    const clients = await TrustedClient.find().sort({ createdAt: -1 });
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

    // Emit real-time event on update
    io.emit("trustedClient:updated", updatedClient);

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

    // Emit real-time event on delete
    io.emit("trustedClient:deleted", id);

    res.status(200).json({ message: "Trusted client deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getTrustedClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await TrustedClient.findById(id);

    if (!client) {
      return res.status(404).json({ message: "Trusted client not found" });
    }

    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
};
