import mongoose, { Schema, Types } from "mongoose";

export interface IMessage {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  ciphertext: string;
  iv: string;
  encryptedSymKey: string;
  createdAt: string;
  expiresAt?: Date | null;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    encryptedSymKey: { type: String, required: true },
    createdAt: { type: String, default: "" },
    expiresAt: { type: Date, default: null, expires: 0 }
  },
  { timestamps: false }
);

export const Message = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
