import mongoose, { Schema } from "mongoose";

export interface IProduct {
  name: string;
  description: string;
  price: string;
  imageUrls: string[];
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: String, required: true },
    imageUrls: { type: [String], default: [] },
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
