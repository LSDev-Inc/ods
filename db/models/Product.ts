import mongoose, { Schema, Types } from "mongoose";

export interface IProductOption {
  _id?: Types.ObjectId;
  name: string;
  quantity: string;
  price: string;
}

export interface IProduct {
  name: string;
  description: string;
  price: string;
  categoryId?: Types.ObjectId | null;
  options: IProductOption[];
  imageUrls: string[];
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
}

const ProductOptionSchema = new Schema<IProductOption>(
  {
    name: { type: String, required: true },
    quantity: { type: String, default: "" },
    price: { type: String, required: true }
  },
  { timestamps: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: false, default: "" },
    price: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    options: { type: [ProductOptionSchema], default: [] },
    imageUrls: { type: [String], default: [] },
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

if (mongoose.models.Product) {
  delete mongoose.models.Product;
}

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
