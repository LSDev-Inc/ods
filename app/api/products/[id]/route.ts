import { NextRequest } from "next/server";
import { dbConnect } from "../../../../db/connection";
import { Category, Product } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { jsonError, jsonOk } from "../../../../lib/http";
import { productUpdateSchema } from "../../../../lib/validators";
import { encryptNumber, encryptString } from "../../../../lib/crypto/data";
import { isAllowedMediaRef, normalizeMediaRef } from "../../../../lib/media";

async function encryptOptions(
  options: { id?: string; name: string; quantity?: string; price: number }[] | undefined
) {
  if (!options) return undefined;

  return Promise.all(
    options.map(async (option) => ({
      ...(option.id ? { _id: option.id } : {}),
      name: await encryptString(option.name.trim()),
      quantity: await encryptString(option.quantity?.trim() ?? ""),
      price: await encryptNumber(option.price)
    }))
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  const product = await Product.findById(id);
  if (!product) return jsonError("Prodotto non trovato", 404);

  if (parsed.data.name) product.name = await encryptString(parsed.data.name);
  if (parsed.data.description !== undefined) {
    product.description = await encryptString(parsed.data.description);
  }
  if (typeof parsed.data.price === "number") {
    product.price = await encryptNumber(parsed.data.price);
  }
  if (parsed.data.categoryId !== undefined) {
    if (parsed.data.categoryId) {
      const category = await Category.findById(parsed.data.categoryId).select("_id").lean();
      if (!category) return jsonError("Categoria non valida", 400);
    }
    product.categoryId = (parsed.data.categoryId || null) as any;
  }
  if (parsed.data.options !== undefined) {
    product.options = (await encryptOptions(parsed.data.options)) as any;
  }
  if (parsed.data.imageUrls && parsed.data.imageUrls.length > 0) {
    const normalizedImages = parsed.data.imageUrls.map((url) => normalizeMediaRef(url));
    if (normalizedImages.some((url) => !isAllowedMediaRef(url))) {
      return jsonError("Media non valida. Usa il caricamento interno.", 400);
    }
    const encryptedImages = await Promise.all(
      normalizedImages.map((url) => encryptString(url))
    );
    product.imageUrls = encryptedImages;
    product.imageUrl = encryptedImages[0] ?? "";
  } else if (parsed.data.imageUrl !== undefined) {
    const normalizedImage = normalizeMediaRef(parsed.data.imageUrl ?? "");
    if (!isAllowedMediaRef(normalizedImage)) {
      return jsonError("Media non valida. Usa il caricamento interno.", 400);
    }
    const encryptedImageUrl = await encryptString(normalizedImage);
    product.imageUrl = encryptedImageUrl;
    product.imageUrls = normalizedImage ? [encryptedImageUrl] : [];
  }
  if (parsed.data.videoUrl !== undefined) {
    const normalizedVideo = normalizeMediaRef(parsed.data.videoUrl ?? "");
    if (!isAllowedMediaRef(normalizedVideo)) {
      return jsonError("Video non valido. Usa il caricamento interno.", 400);
    }
    product.videoUrl = await encryptString(normalizedVideo);
  }

  await product.save();
  return jsonOk({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  await dbConnect();
  const product = await Product.findById(id);
  if (!product) return jsonError("Prodotto non trovato", 404);

  await product.deleteOne();
  return jsonOk({ ok: true });
}
