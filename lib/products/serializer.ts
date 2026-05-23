import { decryptNumber, decryptString } from "../crypto/data";
import { normalizeMediaRef, resolveMediaRef } from "../media";

type SerializedProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  options: SerializedProductOption[];
  imageUrls: string[];
  imageUrl: string;
  videoUrl: string;
  imagePaths?: string[];
  videoPath?: string;
};

type SerializedProductOption = {
  id: string;
  name: string;
  quantity: string;
  price: number;
};

function normalizeImageRefs(product: { imageUrls?: string[]; imageUrl?: string }) {
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    return product.imageUrls;
  }
  if (product.imageUrl) return [product.imageUrl];
  return [];
}

export async function serializeProduct(
  product: any,
  serializationOptions: { includePaths?: boolean } = {}
): Promise<SerializedProduct> {
  try {
    const name = await decryptString(product?.name ?? "");
    const description = await decryptString(product?.description ?? "");
    const price = await decryptNumber(product?.price ?? 0);
    const productOptions = await Promise.all(
      ((product?.options ?? []) as any[]).map(async (option) => ({
        id: String(option?._id ?? option?.id ?? ""),
        name: await decryptString(option?.name ?? ""),
        quantity: await decryptString(option?.quantity ?? ""),
        price: await decryptNumber(option?.price ?? 0)
      }))
    );
    const imageRefsEncrypted = normalizeImageRefs(product ?? {});
    const imageRefs = await Promise.all(imageRefsEncrypted.map((ref) => decryptString(ref)));
    const normalizedImages = imageRefs.map((ref) => normalizeMediaRef(ref));
    const resolvedImages = normalizedImages.map((ref) => resolveMediaRef(ref));
    const filteredImages = resolvedImages.filter((item) => item.url);
    const imageUrls = filteredImages.map((item) => item.url);
    const imagePaths = filteredImages.map((item) => item.ref);
    const videoRefRaw = await decryptString(product?.videoUrl ?? "");
    const videoRef = normalizeMediaRef(videoRefRaw);
    const resolvedVideo = resolveMediaRef(videoRef);

    const serialized: SerializedProduct = {
      id: String(product?._id ?? product?.id ?? ""),
      name,
      description,
      price,
      categoryId: product?.categoryId ? String(product.categoryId) : null,
      options: productOptions,
      imageUrls,
      imageUrl: imageUrls[0] ?? "",
      videoUrl: resolvedVideo.url ?? ""
    };

    if (serializationOptions.includePaths) {
      serialized.imagePaths = imagePaths;
      serialized.videoPath = resolvedVideo.ref ?? "";
    }

    return serialized;
  } catch (error) {
    console.error("Errore durante la serializzazione del prodotto:", error instanceof Error ? error.message : String(error));
    // Ritorna un prodotto vuoto/sicuro in caso di errore
    return {
      id: String(product?._id ?? product?.id ?? ""),
      name: "Prodotto (Corrotto)",
      description: "Errore nel caricamento dei dati",
      price: 0,
      categoryId: null,
      options: [],
      imageUrls: [],
      imageUrl: "",
      videoUrl: ""
    };
  }
}

export async function snapshotProduct(product: any) {
  try {
    const name = await decryptString(product?.name ?? "");
    const price = await decryptNumber(product?.price ?? 0);
    const imageRefsEncrypted = normalizeImageRefs(product ?? {});
    const imageRefs = await Promise.all(imageRefsEncrypted.map((ref) => decryptString(ref)));
    const imageRef = normalizeMediaRef(imageRefs[0] ?? "");
    return {
      name: name || "Prodotto",
      imageRef,
      price
    };
  } catch (error) {
    console.error("Errore durante snapshot del prodotto:", error instanceof Error ? error.message : String(error));
    return {
      name: "Prodotto (Corrotto)",
      imageRef: "",
      price: 0
    };
  }
}
