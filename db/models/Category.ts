import mongoose, { Schema } from "mongoose";

export interface ICategory {
  name: string;
  createdAt: string;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

export const Category =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
