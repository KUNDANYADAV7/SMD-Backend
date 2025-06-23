import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    iconName: {
      type: String,
    },
    iconImage: {
      type: String,
    },
    serviceImage: {
      type: String,
      required: true,
    },
    steps: [
      {
        stepTitle: { type: String },
        stepDescription: { type: String },
        stepImage: { type: String },
      },
    ],
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);


export const Service = mongoose.model("Service", serviceSchema);
