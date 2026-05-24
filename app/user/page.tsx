import { dbConnect } from "../../db/connection";
import { Category, Product, User } from "../../db/models";
import ShopClient from "../../components/shop/ShopClient";
import { Card } from "../../components/ui/card";
import { serializeCategory } from "../../lib/categories/serializer";
import { serializeProduct } from "../../lib/products/serializer";

async function getData() {
  await dbConnect();
  const [products, categories, owner] = await Promise.all([
    Product.find({}).lean(),
    Category.find({}).lean(),
    User.findOne({ role: "owner" }).lean()
  ]);
  const serialized = await Promise.all(products.map((product) => serializeProduct(product)));
  const serializedCategories = await Promise.all(
    categories.map((category) => serializeCategory(category))
  );
  const safeProducts = serialized.map((product) => ({
    _id: product.id,
    name: product.name || "Prodotto",
    description: product.description ?? "",
    price: product.price ?? 0,
    categoryId: product.categoryId,
    options: product.options,
    imageUrls: product.imageUrls,
    videoUrl: product.videoUrl ?? ""
  }));

  return {
    products: safeProducts,
    categories: serializedCategories.filter((category) => category.name),
    ownerPublicKey: owner && !Array.isArray(owner) ? owner.publicKey : ""
  };
}

export default async function UserShopPage() {
  const { products, categories, ownerPublicKey } = await getData();

  if (!ownerPublicKey) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Configurazione mancante</h2>
        <p className="mt-2 text-sm text-muted">
          Nessun owner trovato. Esegui lo script di seed per creare l&apos;account owner.
        </p>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Nessun prodotto disponibile</h2>
        <p className="mt-2 text-sm text-muted">
          Un admin o l&apos;owner devono ancora pubblicare il catalogo.
        </p>
      </Card>
    );
  }

  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Shop riservato</h1>
        <p className="text-sm text-muted">
          Seleziona i prodotti e invia una richiesta cifrata per contattarci.
        </p>
      </div>
      <ShopClient products={products} categories={categories} ownerPublicKey={ownerPublicKey} />
    </section>
  );
}
