import ProductManager from "../../../components/products/ProductManager";

export default function AdminProductsPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Catalogo prodotti</h1>
        <p className="text-sm text-muted">Gestisci i prodotti visibili agli utenti.</p>
      </div>
      <ProductManager />
    </section>
  );
}
