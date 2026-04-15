import dotenv from "dotenv";
import { dbConnect } from "../db/connection";
import { Setting } from "../db/models";
import { hashSecret } from "../lib/crypto/server";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
  const pin = process.argv[2] || process.env.ACCESS_PIN;
  if (!pin) {
    throw new Error("PIN mancante. Passalo come argomento o imposta ACCESS_PIN in .env.local.");
  }

  const hash = await hashSecret(pin);
  await dbConnect();
  await Setting.findOneAndUpdate(
    { key: "accessPinHash" },
    { value: hash, updatedAt: new Date() },
    { upsert: true }
  );

  console.log("Access PIN salvato in MongoDB (hash).");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
