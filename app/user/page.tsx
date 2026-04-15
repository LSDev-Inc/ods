import { dbConnect } from "../../db/connection";
import { Product, User } from "../../db/models";
import ShopClient from "../../components/shop/ShopClient";
import { Card } from "../../components/ui/card";
import { serializeProduct } from "../../lib/products/serializer";

async function getData() {
  await dbConnect();
  const [products, owner] = await Promise.all([
    Product.find({}).limit(6).lean(),
    User.findOne({ role: "owner" }).lean()
  ]);
  const serialized = await Promise.all(products.map((product) => serializeProduct(product)));
  const safeProducts = serialized.map((product) => ({
    _id: product.id,
    name: product.name || "Prodotto",
    description: product.description ?? "",
    price: product.price ?? 0,
    imageUrls: product.imageUrls,
    videoUrl: product.videoUrl ?? ""
  }));

  return {
    products: safeProducts,
    ownerPublicKey: owner && !Array.isArray(owner) ? owner.publicKey : ""
  };
}

export default async function UserShopPage() {
  const { products, ownerPublicKey } = await getData();

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
          Seleziona i prodotti e invia una richiesta cifrata end-to-end.
        </p>
      </div>
      <ShopClient products={products} ownerPublicKey={ownerPublicKey} />
    </section>
  );
}
