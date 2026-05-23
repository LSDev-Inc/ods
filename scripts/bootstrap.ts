import dotenv from "dotenv";
import { dbConnect } from "../db/connection";
import { Setting, User } from "../db/models";
import { hashSecret } from "../lib/crypto/server";
import { encryptDate, encryptString, hashLookup, normalizeUsername } from "../lib/crypto/data";
import { encryptPrivateKey, exportPublicKey, generateKeyPair } from "../lib/crypto/node";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ownerDefaults = {
  username: process.env.OWNER_USERNAME || "owner",
  password: process.env.OWNER_PASSWORD,
  pin: process.env.OWNER_PIN
};

const adminDefaults = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD,
  pin: process.env.ADMIN_PIN
};

function log(message: string) {
  console.log(`[bootstrap] ${message}`);
}

async function ensureAccessPinHash(rawPin: string) {
  const hash = await hashSecret(rawPin);
  await Setting.findOneAndUpdate(
    { key: "accessPinHash" },
    { value: hash, updatedAt: new Date() },
    { upsert: true }
  );
  log("Access PIN salvato in MongoDB (hash).");
}

async function createSecureUser(role: "owner" | "admin", username: string, password: string, pin: string) {
  const normalizedUsername = normalizeUsername(username);
  const usernameHash = hashLookup(normalizedUsername, "username");
  const keyPair = await generateKeyPair();
  const publicKey = await exportPublicKey(keyPair.publicKey);
  const { privateKeyEncrypted, privateKeyIv, kdfSalt } = await encryptPrivateKey(
    keyPair.privateKey,
    password,
    pin
  );

  const passwordHash = await hashSecret(password);
  const pinOrPassphraseHash = await hashSecret(pin);

  return User.create({
    username: await encryptString(normalizedUsername),
    usernameHash,
    passwordHash,
    pinOrPassphraseHash,
    role,
    publicKey,
    privateKeyEncrypted,
    privateKeyIv,
    kdfSalt,
    disabled: false,
    createdAt: await encryptDate(new Date())
  });
}

async function seedUsers() {
  const ownerExists = await User.findOne({ role: "owner" }).lean();
  if (!ownerExists) {
    await createSecureUser("owner", ownerDefaults.username, ownerDefaults.password!, ownerDefaults.pin!);
    log("Owner creato");
  }

  const adminExists = await User.findOne({ role: "admin" }).lean();
  if (!adminExists) {
    await createSecureUser("admin", adminDefaults.username, adminDefaults.password!, adminDefaults.pin!);
    log("Admin creato");
  }
}

async function run() {
  const accessPin = process.env.ACCESS_PIN;
  const canSeedUsers = Boolean(
    ownerDefaults.password && ownerDefaults.pin && adminDefaults.password && adminDefaults.pin
  );
  const shouldRun = Boolean(accessPin) || canSeedUsers;

  if (!shouldRun) {
    log("Bootstrap opzionale saltato.");
    return;
  }

  await dbConnect();

  if (accessPin) {
    await ensureAccessPinHash(accessPin);
  } else {
    log("Access PIN non modificato.");
  }

  if (canSeedUsers) {
    await seedUsers();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
