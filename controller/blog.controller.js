import mongoose from "mongoose";
import { Blog } from "../models/blog.model.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import { io } from "../index.js";
import { cache } from "../middleware/cache.js";

export const createBlog = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Blog Image is required" });
    }

    const { title, category, about } = req.body;
    if (!title || !category || !about) {
      return res.status(400).json({ message: "Title, category & about are required fields" });
    }

    const adminName = req.user?.name;
    const adminPhoto = req.user?.photo;
    const createdBy = req.user?._id;

    let slug = slugify(title, { lower: true, strict: true });
    let existingBlog = await Blog.findOne({ slug });
    let count = 1;
    while (existingBlog) {
      slug = slugify(`${title}-${count}`, { lower: true, strict: true });
      existingBlog = await Blog.findOne({ slug });
      count++;
    }

    const imagePath = req.file.path.replace(/\\/g, "/").replace("public/", "");

    const blog = await Blog.create({
      title,
      slug,
      about,
      category,
      adminName,
      adminPhoto,
      createdBy,
      photo: imagePath,
    });

    io.emit("blogCreated", blog);

    // ✅ Clear related cache
    cache.del("allBlogs");
    cache.del(`myBlogs:${createdBy}`);

    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.photo) {
      const imagePath = path.join("public", blog.photo);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await blog.deleteOne();

    io.emit("blogDeleted", { id });

    // ✅ Clear related cache
    cache.del("allBlogs");
    cache.del(`blog:${blog.slug}`);
    cache.del(`myBlogs:${blog.createdBy}`);

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", details: error.message });
  }
};

export const updateBlog = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Blog ID" });
  }

  try {
    const { title, category, about } = req.body;
    if (!title || !category || !about) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    let updateData = {
      title,
      category,
      about,
      slug: slugify(title, { lower: true, strict: true }),
    };

    if (req.file) {
      const oldImagePath = blog.photo;
      if (oldImagePath) {
        const oldImageFullPath = path.join("public", oldImagePath);
        if (fs.existsSync(oldImageFullPath)) {
          fs.unlinkSync(oldImageFullPath);
        }
      }
      updateData.photo = req.file.path.replace(/\\/g, "/").replace("public/", "");
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

    io.emit("blogUpdated", updatedBlog);

    // ✅ Clear related cache
    cache.del("allBlogs");
    cache.del(`blog:${blog.slug}`);
    cache.del(`myBlogs:${blog.createdBy}`);

    res.status(200).json({ message: "Blog updated successfully", updatedBlog });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", details: error.message });
  }
};

export const getAllBlogs = async (req, res) => {
  try {
    const cached = cache.get("allBlogs");
    if (cached) {
      return res.status(200).json(cached);
    }

    const allBlogs = await Blog.find();
    cache.set("allBlogs", allBlogs);
    res.status(200).json(allBlogs);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

export const getSingleBlogs = async (req, res) => {
  try {
    const { slug } = req.params;
    const cached = cache.get(`blog:${slug}`);
    if (cached) {
      return res.status(200).json(cached);
    }

    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    cache.set(`blog:${slug}`, blog);
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const getMyBlogs = async (req, res) => {
  try {
    const createdBy = req.user._id;
    const cached = cache.get(`myBlogs:${createdBy}`);
    if (cached) {
      return res.status(200).json(cached);
    }

    const myBlogs = await Blog.find({ createdBy });
    cache.set(`myBlogs:${createdBy}`, myBlogs);
    res.status(200).json(myBlogs);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};
