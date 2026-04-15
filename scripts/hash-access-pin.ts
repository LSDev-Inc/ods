import dotenv from "dotenv";
import { hashSecret } from "../lib/crypto/server";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
  const pin = process.argv[2] || process.env.ACCESS_PIN;
  if (!pin) {
    throw new Error("PIN mancante. Passalo come argomento oppure imposta ACCESS_PIN in .env.local.");
  }
  const hash = await hashSecret(pin);
  console.log(`ACCESS_PIN_HASH="${hash}"`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
