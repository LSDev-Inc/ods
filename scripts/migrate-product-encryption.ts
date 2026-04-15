import { dbConnect } from "../db/connection";
import { Product, Report } from "../db/models";
import { encryptString, isEncrypted } from "../lib/crypto/data";
import { normalizeMediaRef } from "../lib/media";

async function normalizeAndEncrypt(value?: string) {
  if (!value) return "";
  const normalized = normalizeMediaRef(value);
  if (isEncrypted(normalized)) return normalized;
  return encryptString(normalized);
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
        normalizedImages.map((img: string) => normalizeAndEncrypt(img))
      );
      if (encryptedImages.some((img, idx) => img !== normalizedImages[idx])) {
        product.imageUrls = encryptedImages;
        product.imageUrl = encryptedImages[0] ?? "";
        changed = true;
      }
    }

    if (product.videoUrl) {
      const normalizedVideo = normalizeMediaRef(product.videoUrl);
      if (normalizedVideo !== product.videoUrl || !isEncrypted(product.videoUrl)) {
        product.videoUrl = await encryptString(normalizedVideo);
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
          item.imageUrl = await encryptString(item.imageUrl);
          changed = true;
        }
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
  const productCount = await migrateProducts();
  const reportCount = await migrateReports();
  console.log(`Prodotti aggiornati: ${productCount}`);
  console.log(`Report aggiornati: ${reportCount}`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
