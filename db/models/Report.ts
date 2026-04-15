import mongoose, { Schema, Types } from "mongoose";

export interface IReportProduct {
  productId: Types.ObjectId;
  name: string;
  imageUrl: string;
  quantity: number;
  priceAtSale: string;
}

export interface IReport {
  userId: Types.ObjectId;
  requestId: Types.ObjectId;
  chatId: Types.ObjectId;
  products: IReportProduct[];
  total: string;
  createdAt: string;
}

const ReportSchema = new Schema<IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestId: { type: Schema.Types.ObjectId, ref: "Request", required: true },
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        imageUrl: { type: String, required: true },
        quantity: { type: Number, required: true },
        priceAtSale: { type: String, required: true }
      }
    ],
    total: { type: String, required: true },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

export const Report =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
