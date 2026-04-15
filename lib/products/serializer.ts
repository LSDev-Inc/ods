import { decryptNumber, decryptString } from "../crypto/data";
import { normalizeMediaRef, resolveMediaRef } from "../media";

type SerializedProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  imageUrl: string;
  videoUrl: string;
  imagePaths?: string[];
  videoPath?: string;
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
  options: { includePaths?: boolean } = {}
): Promise<SerializedProduct> {
  const name = await decryptString(product?.name ?? "");
  const description = await decryptString(product?.description ?? "");
  const price = await decryptNumber(product?.price ?? 0);
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
    imageUrls,
    imageUrl: imageUrls[0] ?? "",
    videoUrl: resolvedVideo.url ?? ""
  };

  if (options.includePaths) {
    serialized.imagePaths = imagePaths;
    serialized.videoPath = resolvedVideo.ref ?? "";
  }

  return serialized;
}

export async function snapshotProduct(product: any) {
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
}
