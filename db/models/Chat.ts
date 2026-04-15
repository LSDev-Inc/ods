import mongoose, { Schema, Types } from "mongoose";

export type ChatStatus = "in_progress" | "completed";

export interface IChat {
  requestId: Types.ObjectId;
  userId: Types.ObjectId;
  adminId?: Types.ObjectId | null;
  lockedToAdminId?: Types.ObjectId | null;
  status: ChatStatus;
  completedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: string;
}

const ChatSchema = new Schema<IChat>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "Request", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lockedToAdminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress"
    },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, expires: 0 },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

export const Chat = mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
