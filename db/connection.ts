import mongoose from "mongoose";
import { env } from "../lib/env";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = global as typeof global & { mongoose: MongooseCache };
const DEFAULT_DB_NAME = "shadowshop";

function toPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getMongoConnectionOptions() {
  return {
    dbName: process.env.MONGODB_DB_NAME?.trim() || DEFAULT_DB_NAME,
    serverSelectionTimeoutMS: toPositiveInteger(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 5000),
    connectTimeoutMS: toPositiveInteger(process.env.MONGODB_CONNECT_TIMEOUT_MS, 10000),
    socketTimeoutMS: toPositiveInteger(process.env.MONGODB_SOCKET_TIMEOUT_MS, 20000)
  };
}

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (globalForMongoose.mongoose.conn) return globalForMongoose.mongoose.conn;

  if (!globalForMongoose.mongoose.promise) {
    const options = getMongoConnectionOptions();
    globalForMongoose.mongoose.promise = mongoose.connect(env.mongodbUri(), options).catch((error) => {
      globalForMongoose.mongoose.promise = null;
      throw error;
    });
  }

  globalForMongoose.mongoose.conn = await globalForMongoose.mongoose.promise;
  return globalForMongoose.mongoose.conn;
}
