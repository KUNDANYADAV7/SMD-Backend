import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, index: true },
    description: { type: String, default: "" },
    image: {
      type: String,
      required: true,
      trim: true
    },
    additionalImages: {
      type: [String],
      default: [],
      validate: [
        (arr) => arr.length <= 3,
        "You can upload up to 3 additional images only."
      ]
    },
    mapUrl: { type: String, default: "" },

    // New fields added below
    status: {
      type: String,
      enum: ["Ongoing", "Upcoming", "Completed"],
      required: true
    },
    address: {
      type: String,
      default: "" // optional
    },
    architect: {
      type: String,
      default: "SMD Engineer"
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Project = mongoose.model("Project", projectSchema);
