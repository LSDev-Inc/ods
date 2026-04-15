import mongoose, { Schema } from "mongoose";

export interface ISetting {
  key: string;
  value: string;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
