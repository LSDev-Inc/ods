import { notFound } from "next/navigation";
import { dbConnect } from "../../../../db/connection";
import { Product } from "../../../../db/models";
import ProductDetailClient from "../../../../components/shop/ProductDetailClient";
import { serializeProduct } from "../../../../lib/products/serializer";

export const dynamic = "force-dynamic";

export default async function UserProductPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await dbConnect();
  const product = await Product.findById(id).lean();
  if (!product) notFound();

  const serialized = await serializeProduct(product);

  return (
    <ProductDetailClient
      product={{
        _id: serialized.id,
        name: serialized.name || "Prodotto",
        description: serialized.description ?? "",
        price: serialized.price ?? 0,
        categoryId: serialized.categoryId,
        options: serialized.options,
        imageUrls: serialized.imageUrls,
        imageUrl: serialized.imageUrl,
        videoUrl: serialized.videoUrl ?? ""
      }}
    />
  );
}
