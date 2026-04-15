import ProductManager from "../../../components/products/ProductManager";

export default function OwnerProductsPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Catalogo prodotti</h1>
        <p className="text-sm text-muted">
          Pubblica, modifica o rimuovi prodotti dal catalogo.
        </p>
      </div>
      <ProductManager />
    </section>
  );
}
