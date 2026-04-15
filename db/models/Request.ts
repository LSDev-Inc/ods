import mongoose, { Schema, Types } from "mongoose";

export type RequestStatus = "pending" | "accepted" | "rejected";

export interface IRequestProduct {
  productId: Types.ObjectId;
  quantity: number;
}

export interface IRequest {
  userId: Types.ObjectId;
  products: IRequestProduct[];
  totalPrice: string;
  customMessageCiphertext: string;
  customMessageIv: string;
  customMessageEncryptedSymKey: string;
  status: RequestStatus;
  assignedAdminId?: Types.ObjectId | null;
  createdAt: string;
}

const RequestSchema = new Schema<IRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true }
      }
    ],
    totalPrice: { type: String, required: true },
    customMessageCiphertext: { type: String, required: true },
    customMessageIv: { type: String, required: true },
    customMessageEncryptedSymKey: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

export const Request = mongoose.models.Request || mongoose.model<IRequest>("Request", RequestSchema);
