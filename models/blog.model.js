import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    photo: { type: String, required: true },
    category: {
      type: String,
      required: true,
    },
    about: {
      type: String,
      required: true,
      // minlength: [200, "Should contain at least 200 characters!"],
    },
    adminName: {
      type: String,
    },
    adminPhoto: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);


export const Blog = mongoose.model("Blog", blogSchema);
