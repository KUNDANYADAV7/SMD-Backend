import mongoose from "mongoose";

const trustedClientSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true, // ensure image is required
    },
  },
  { timestamps: true }
);

export const TrustedClient = mongoose.model("TrustedClient", trustedClientSchema);
