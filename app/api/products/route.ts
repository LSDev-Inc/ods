import { NextRequest } from "next/server";
import { dbConnect } from "../../../db/connection";
import { Category, Product } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import { jsonError, jsonOk } from "../../../lib/http";
import { productCreateSchema } from "../../../lib/validators";
import { encryptDate, encryptNumber, encryptString } from "../../../lib/crypto/data";
import { serializeProduct } from "../../../lib/products/serializer";
import { isAllowedMediaRef, normalizeMediaRef } from "../../../lib/media";

async function encryptOptions(
  options: { id?: string; name: string; quantity?: string; price: number }[] | undefined
) {
  if (!options?.length) return [];

  return Promise.all(
    options.map(async (option) => ({
      ...(option.id ? { _id: option.id } : {}),
      name: await encryptString(option.name.trim()),
      quantity: await encryptString(option.quantity?.trim() ?? ""),
      price: await encryptNumber(option.price)
    }))
  );
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  await dbConnect();
  const products = await Product.find({}).lean();
  const serialized = await Promise.all(
    products.map((product) => serializeProduct(product, { includePaths: true }))
  );
  return jsonOk(serialized);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  if (parsed.data.categoryId) {
    const category = await Category.findById(parsed.data.categoryId).select("_id").lean();
    if (!category) return jsonError("Categoria non valida", 400);
  }

  const imageUrls =
    parsed.data.imageUrls && parsed.data.imageUrls.length > 0
      ? parsed.data.imageUrls
      : parsed.data.imageUrl
        ? [parsed.data.imageUrl]
        : [];

  const normalizedImages = imageUrls.map((url) => normalizeMediaRef(url));
  if (normalizedImages.some((url) => !isAllowedMediaRef(url))) {
    return jsonError("Media non valida. Usa il caricamento interno.", 400);
  }

  const normalizedVideo = normalizeMediaRef(parsed.data.videoUrl ?? "");
  if (!isAllowedMediaRef(normalizedVideo)) {
    return jsonError("Video non valido. Usa il caricamento interno.", 400);
  }

  const encryptedImages = await Promise.all(normalizedImages.map((url) => encryptString(url)));
  const encryptedOptions = await encryptOptions(parsed.data.options);
  const created = await Product.create({
    name: await encryptString(parsed.data.name),
    description: await encryptString(parsed.data.description?.trim() ?? ""),
    price: await encryptNumber(parsed.data.price),
    categoryId: parsed.data.categoryId ?? null,
    options: encryptedOptions,
    imageUrls: encryptedImages,
    imageUrl: encryptedImages[0] ?? "",
    videoUrl: await encryptString(normalizedVideo),
    createdAt: await encryptDate(new Date())
  });

  return jsonOk({ id: String(created._id) }, 201);
}
