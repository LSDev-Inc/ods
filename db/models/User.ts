import mongoose, { Schema } from "mongoose";

export type Role = "owner" | "admin" | "user";

export interface IUser {
  username: string;
  usernameHash: string;
  passwordHash: string;
  pinOrPassphraseHash: string;
  role: Role;
  publicKey: string;
  privateKeyEncrypted: string;
  privateKeyIv: string;
  kdfSalt: string;
  disabled: boolean;
  createdAt: string;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    usernameHash: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    pinOrPassphraseHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "admin", "user"], required: true },
    publicKey: { type: String, required: true },
    privateKeyEncrypted: { type: String, required: true },
    privateKeyIv: { type: String, required: true },
    kdfSalt: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    createdAt: { type: String, default: "" }
  },
  { timestamps: false }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
