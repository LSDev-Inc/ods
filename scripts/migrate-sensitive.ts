import dotenv from "dotenv";
import { dbConnect } from "../db/connection";
import { Chat, Message, Product, Report, Request, User } from "../db/models";
import {
  decryptString,
  encryptDate,
  encryptNumber,
  encryptString,
  hashLookup,
  isEncrypted,
  normalizeUsername
} from "../lib/crypto/data";
import { normalizeMediaRef } from "../lib/media";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function migrateUsers() {
  const users = await User.find({});
  let updated = 0;

  for (const user of users) {
    let changed = false;
    if (user.username) {
      const plainUsername = isEncrypted(user.username)
        ? await decryptString(user.username)
        : user.username;
      const normalized = normalizeUsername(plainUsername);
      if (!isEncrypted(user.username)) {
        user.username = await encryptString(normalized);
        changed = true;
      }
      const expectedHash = hashLookup(normalized, "username");
      if (user.usernameHash !== expectedHash) {
        user.usernameHash = expectedHash;
        changed = true;
      }
    }

    if (user.createdAt) {
      if (user.createdAt instanceof Date) {
        user.createdAt = await encryptDate(user.createdAt);
        changed = true;
      } else if (typeof user.createdAt === "string" && !isEncrypted(user.createdAt)) {
        user.createdAt = await encryptDate(user.createdAt);
        changed = true;
      }
    }

    if (changed) {
      await user.save();
      updated += 1;
    }
  }

  return updated;
}

async function migrateProducts() {
  const products = await Product.find({});
  let updated = 0;

  for (const product of products) {
    let changed = false;
    if (product.name && !isEncrypted(product.name)) {
      product.name = await encryptString(product.name);
      changed = true;
    }
    if (product.description && !isEncrypted(product.description)) {
      product.description = await encryptString(product.description);
      changed = true;
    }

    const normalizedImages: string[] =
      Array.isArray(product.imageUrls) && product.imageUrls.length > 0
        ? product.imageUrls
        : product.imageUrl
          ? [product.imageUrl]
          : [];
    if (normalizedImages.length > 0) {
      const encryptedImages = await Promise.all(
        normalizedImages.map(async (img: string) => {
          const normalized = normalizeMediaRef(img);
          if (isEncrypted(normalized)) return normalized;
          return encryptString(normalized);
        })
      );
      if (encryptedImages.some((img, idx) => img !== normalizedImages[idx])) {
        product.imageUrls = encryptedImages;
        product.imageUrl = encryptedImages[0] ?? "";
        changed = true;
      }
    }

    if (product.videoUrl) {
      const normalizedVideo = normalizeMediaRef(product.videoUrl);
      if (!isEncrypted(normalizedVideo)) {
        product.videoUrl = await encryptString(normalizedVideo);
        changed = true;
      } else if (normalizedVideo !== product.videoUrl) {
        product.videoUrl = normalizedVideo;
        changed = true;
      }
    }

    if (product.price !== undefined && product.price !== null) {
      if (typeof product.price === "number") {
        product.price = await encryptNumber(product.price);
        changed = true;
      } else if (typeof product.price === "string" && !isEncrypted(product.price)) {
        const parsed = Number(product.price);
        product.price = await encryptNumber(Number.isFinite(parsed) ? parsed : 0);
        changed = true;
      }
    }

    if (product.createdAt) {
      if (product.createdAt instanceof Date) {
        product.createdAt = await encryptDate(product.createdAt);
        changed = true;
      } else if (typeof product.createdAt === "string" && !isEncrypted(product.createdAt)) {
        product.createdAt = await encryptDate(product.createdAt);
        changed = true;
      }
    }

    if (changed) {
      await product.save();
      updated += 1;
    }
  }

  return updated;
}

async function migrateRequests() {
  const requests = await Request.find({});
  let updated = 0;

  for (const req of requests) {
    let changed = false;
    if (req.totalPrice !== undefined && req.totalPrice !== null) {
      if (typeof req.totalPrice === "number") {
        req.totalPrice = await encryptNumber(req.totalPrice);
        changed = true;
      } else if (typeof req.totalPrice === "string" && !isEncrypted(req.totalPrice)) {
        const parsed = Number(req.totalPrice);
        req.totalPrice = await encryptNumber(Number.isFinite(parsed) ? parsed : 0);
        changed = true;
      }
    }
    if (req.createdAt) {
      if (req.createdAt instanceof Date) {
        req.createdAt = await encryptDate(req.createdAt);
        changed = true;
      } else if (typeof req.createdAt === "string" && !isEncrypted(req.createdAt)) {
        req.createdAt = await encryptDate(req.createdAt);
        changed = true;
      }
    }
    if (changed) {
      await req.save();
      updated += 1;
    }
  }

  return updated;
}

async function migrateChats() {
  const chats = await Chat.find({});
  let updated = 0;

  for (const chat of chats) {
    let changed = false;
    if (chat.createdAt) {
      if (chat.createdAt instanceof Date) {
        chat.createdAt = await encryptDate(chat.createdAt);
        changed = true;
      } else if (typeof chat.createdAt === "string" && !isEncrypted(chat.createdAt)) {
        chat.createdAt = await encryptDate(chat.createdAt);
        changed = true;
      }
    }
    if (changed) {
      await chat.save();
      updated += 1;
    }
  }

  return updated;
}

async function migrateMessages() {
  const messages = await Message.find({});
  let updated = 0;

  for (const message of messages) {
    let changed = false;
    if (message.createdAt) {
      if (message.createdAt instanceof Date) {
        message.createdAt = await encryptDate(message.createdAt);
        changed = true;
      } else if (typeof message.createdAt === "string" && !isEncrypted(message.createdAt)) {
        message.createdAt = await encryptDate(message.createdAt);
        changed = true;
      }
    }
    if (changed) {
      await message.save();
      updated += 1;
    }
  }

  return updated;
}

async function migrateReports() {
  const reports = await Report.find({});
  let updated = 0;

  for (const report of reports) {
    let changed = false;
    if (Array.isArray(report.products)) {
      for (const item of report.products) {
        if (item.name && !isEncrypted(item.name)) {
          item.name = await encryptString(item.name);
          changed = true;
        }
        if (item.imageUrl && !isEncrypted(item.imageUrl)) {
          const normalized = normalizeMediaRef(item.imageUrl);
          item.imageUrl = await encryptString(normalized);
          changed = true;
        }
        if (item.priceAtSale !== undefined && item.priceAtSale !== null) {
          if (typeof item.priceAtSale === "number") {
            item.priceAtSale = await encryptNumber(item.priceAtSale);
            changed = true;
          } else if (typeof item.priceAtSale === "string" && !isEncrypted(item.priceAtSale)) {
            const parsed = Number(item.priceAtSale);
            item.priceAtSale = await encryptNumber(Number.isFinite(parsed) ? parsed : 0);
            changed = true;
          }
        }
      }
    }
    if (report.total !== undefined && report.total !== null) {
      if (typeof report.total === "number") {
        report.total = await encryptNumber(report.total);
        changed = true;
      } else if (typeof report.total === "string" && !isEncrypted(report.total)) {
        const parsed = Number(report.total);
        report.total = await encryptNumber(Number.isFinite(parsed) ? parsed : 0);
        changed = true;
      }
    }
    if (report.createdAt) {
      if (report.createdAt instanceof Date) {
        report.createdAt = await encryptDate(report.createdAt);
        changed = true;
      } else if (typeof report.createdAt === "string" && !isEncrypted(report.createdAt)) {
        report.createdAt = await encryptDate(report.createdAt);
        changed = true;
      }
    }
    if (changed) {
      await report.save();
      updated += 1;
    }
  }

  return updated;
}

async function run() {
  await dbConnect();
  const [users, products, requests, chats, messages, reports] = await Promise.all([
    migrateUsers(),
    migrateProducts(),
    migrateRequests(),
    migrateChats(),
    migrateMessages(),
    migrateReports()
  ]);

  console.log(`Utenti aggiornati: ${users}`);
  console.log(`Prodotti aggiornati: ${products}`);
  console.log(`Richieste aggiornate: ${requests}`);
  console.log(`Chat aggiornate: ${chats}`);
  console.log(`Messaggi aggiornati: ${messages}`);
  console.log(`Report aggiornati: ${reports}`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
