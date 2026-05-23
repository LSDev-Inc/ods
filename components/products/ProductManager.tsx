"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { formatEuro } from "../../lib/formatPrice";
import { toBlobProxyUrl, toBlobRef } from "../../lib/media";

type Category = {
  id: string;
  name: string;
};

type ProductOption = {
  id?: string;
  name: string;
  quantity: string;
  price: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  options: ProductOption[];
  imageUrls: string[];
  imageUrl?: string;
  videoUrl?: string;
  imagePaths?: string[];
  videoPath?: string;
};

type DraftOption = {
  id?: string;
  name: string;
  quantity: string;
  price: string;
};

type Draft = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  options: DraftOption[];
  imageUrls: string[];
  imagePaths: string[];
  videoUrl: string;
  videoPath: string;
};

const MAX_IMAGE_BYTES = 1_000_000;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const emptyOption = (): DraftOption => ({
  name: "",
  quantity: "",
  price: ""
});

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  price: "",
  categoryId: "",
  options: [],
  imageUrls: [],
  imagePaths: [],
  videoUrl: "",
  videoPath: ""
});

const toPriceNumber = (value: string) => {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const randomToken = () => {
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const extensionFromType = (type: string, fallback: string) => {
  const [, subtype] = type.split("/");
  if (!subtype) return fallback;
  return subtype.replace(/[^a-z0-9]/gi, "").toLowerCase() || fallback;
};

const privateMediaPath = (folder: "images" | "videos", type: string) => {
  const fallback = folder === "images" ? "webp" : "mp4";
  return `products/${folder}/${Date.now()}-${randomToken()}.${extensionFromType(type, fallback)}`;
};

async function normalizeImageForPrivacy(file: File) {
  if (file.type === "image/svg+xml") {
    throw new Error("Formato SVG non ammesso.");
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Immagine non leggibile."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas non disponibile.");
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (value) resolve(value);
          else reject(new Error("Normalizzazione immagine non riuscita."));
        },
        "image/webp",
        0.9
      );
    });

    return new File([blob], `${randomToken()}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseOptions(options: DraftOption[]) {
  const activeOptions = options.filter(
    (option) => option.name.trim() || option.quantity.trim() || option.price.trim()
  );

  const parsed = [];
  for (const option of activeOptions) {
    const price = toPriceNumber(option.price);
    if (!option.name.trim()) {
      return { error: "Ogni quantita deve avere un nome.", options: [] };
    }
    if (price === null) {
      return { error: "Prezzo quantita non valido.", options: [] };
    }
    parsed.push({
      id: option.id,
      name: option.name.trim(),
      quantity: option.quantity.trim(),
      price
    });
  }

  return { error: null, options: parsed };
}

function OptionsEditor({
  options,
  onChange
}: {
  options: DraftOption[];
  onChange: (options: DraftOption[]) => void;
}) {
  const updateOption = (index: number, patch: Partial<DraftOption>) => {
    onChange(
      options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option
      )
    );
  };

  return (
    <div className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Quantita e prezzi</p>
          <p className="text-xs text-muted">Aggiungi righe acquistabili nel dettaglio prodotto.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...options, emptyOption()])} className="w-full shrink-0 sm:w-auto">
          Aggiungi quantita
        </Button>
      </div>
      {options.length ? (
        <div className="grid gap-3">
          {options.map((option, index) => (
            <div
              key={`${option.id ?? "new"}-${index}`}
              className="min-w-0 grid gap-3 rounded-2xl border border-white/10 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nome"
                  value={option.name}
                  onChange={(e) => updateOption(index, { name: e.target.value })}
                  placeholder="Zucchero"
                />
                <Input
                  label="Quantita"
                  value={option.quantity}
                  onChange={(e) => updateOption(index, { quantity: e.target.value })}
                  placeholder="70 g"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    label="Prezzo"
                    value={option.price}
                    onChange={(e) => updateOption(index, { price: e.target.value })}
                    placeholder="8.00"
                    type="text"
                    inputMode="decimal"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))}
                  className="w-full shrink-0 sm:w-auto"
                >
                  Rimuovi
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategorySelect({
  categories,
  value,
  onChange
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="text-muted">Categoria</span>
      <select
        className="input-surface w-full min-w-0 rounded-2xl px-4 py-3 text-sm text-fog focus:outline-none focus:ring-2 focus:ring-ember/40"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Senza categoria</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [form, setForm] = useState<Draft>(emptyDraft());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editVideoUploading, setEditVideoUploading] = useState(false);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [productsRes, categoriesRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories")
    ]);
    if (!productsRes.ok || !categoriesRes.ok) {
      setError("Impossibile caricare prodotti e categorie.");
      setLoading(false);
      return;
    }
    const [productsData, categoriesData] = await Promise.all([
      productsRes.json() as Promise<Product[]>,
      categoriesRes.json() as Promise<Category[]>
    ]);
    setProducts(productsData);
    setCategories(categoriesData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadImageFiles = async (files: File[]) => {
    const uploads = [];
    const { upload } = await import("@vercel/blob/client");

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Formato immagine non valido.");
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Immagine troppo grande. Max 1 MB.");
      }

      const normalized = await normalizeImageForPrivacy(file);
      if (normalized.size > MAX_IMAGE_BYTES) {
        throw new Error("Immagine troppo grande dopo normalizzazione.");
      }

      const pathname = privateMediaPath("images", normalized.type);
      const blob = await upload(pathname, normalized, {
        access: "private",
        handleUploadUrl: "/api/blob/upload"
      });
      const pathRef = toBlobRef(blob.pathname);
      uploads.push({
        pathRef,
        previewUrl: toBlobProxyUrl(blob.pathname)
      });
    }

    return uploads;
  };

  const uploadVideoFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      throw new Error("Formato video non valido.");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error("Video troppo grande. Max 200 MB.");
    }

    let pathname = privateMediaPath("videos", file.type);
    if (isLocalhost) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pathname", pathname);
      const res = await fetch("/api/blob/local-upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Upload video non riuscito.");
      }
      pathname = data.pathname;
    } else {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
        multipart: true
      });
      pathname = blob.pathname;
    }

    return {
      pathRef: toBlobRef(pathname),
      previewUrl: toBlobProxyUrl(pathname)
    };
  };

  const handleCreateCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    setCategorySaving(true);
    setStatus(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Categoria non salvata.");
      setCategorySaving(false);
      return;
    }
    setCategoryName("");
    await load();
    setCategorySaving(false);
  };

  const handleDeleteCategory = async (id: string) => {
    const proceed = window.confirm("Vuoi eliminare questa categoria?");
    if (!proceed) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Categoria non eliminata.");
      return;
    }
    await load();
  };

  const handleCreate = async () => {
    setFormError(null);
    setStatus(null);
    const name = form.name.trim();
    const description = form.description.trim();
    const price = toPriceNumber(form.price);
    const parsedOptions = parseOptions(form.options);
    if (!name) {
      setFormError("Il nome e obbligatorio.");
      return;
    }
    if (price === null) {
      setFormError("Prezzo non valido.");
      return;
    }
    if (parsedOptions.error) {
      setFormError(parsedOptions.error);
      return;
    }
    if (!form.imagePaths.length) {
      setFormError("Almeno una immagine e obbligatoria.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price,
        categoryId: form.categoryId || null,
        options: parsedOptions.options,
        imageUrls: form.imagePaths,
        videoUrl: form.videoPath || ""
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data?.error ?? "Salvataggio non riuscito.");
      setSaving(false);
      return;
    }
    setStatus("Prodotto creato.");
    setForm(emptyDraft());
    await load();
    setSaving(false);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    const normalized =
      Array.isArray(product.imageUrls) && product.imageUrls.length > 0
        ? product.imageUrls
        : product.imageUrl
          ? [product.imageUrl]
          : [];
    setEditDraft({
      name: product.name,
      description: product.description,
      price: String(product.price),
      categoryId: product.categoryId ?? "",
      options: (product.options ?? []).map((option) => ({
        id: option.id,
        name: option.name,
        quantity: option.quantity,
        price: String(option.price)
      })),
      imageUrls: normalized,
      imagePaths:
        product.imagePaths && product.imagePaths.length > 0 ? product.imagePaths : normalized,
      videoUrl: product.videoUrl ?? "",
      videoPath: product.videoPath ?? ""
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const handleUpdate = async () => {
    if (!editingId || !editDraft) return;
    setEditError(null);
    const name = editDraft.name.trim();
    const description = editDraft.description.trim();
    const price = toPriceNumber(editDraft.price);
    const parsedOptions = parseOptions(editDraft.options);
    if (!name) {
      setEditError("Il nome e obbligatorio.");
      return;
    }
    if (price === null) {
      setEditError("Prezzo non valido.");
      return;
    }
    if (parsedOptions.error) {
      setEditError(parsedOptions.error);
      return;
    }
    if (!editDraft.imagePaths.length) {
      setEditError("Almeno una immagine e obbligatoria.");
      return;
    }

    setUpdatingId(editingId);
    const res = await fetch(`/api/products/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price,
        categoryId: editDraft.categoryId || null,
        options: parsedOptions.options,
        imageUrls: editDraft.imagePaths,
        videoUrl: editDraft.videoPath || ""
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data?.error ?? "Aggiornamento non riuscito.");
      setUpdatingId(null);
      return;
    }
    await load();
    setUpdatingId(null);
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    const proceed = window.confirm("Vuoi eliminare questo prodotto?");
    if (!proceed) return;
    setDeletingId(id);
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Eliminazione non riuscita.");
      setDeletingId(null);
      return;
    }
    await load();
    setDeletingId(null);
  };

  const categoryNameFor = (id: string | null) => {
    return categories.find((category) => category.id === id)?.name ?? "Senza categoria";
  };

  if (loading) return <p className="text-sm text-muted">Caricamento prodotti...</p>;
  if (error) return <p className="text-sm text-ember">{error}</p>;

  return (
    <div className="grid gap-8">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <h2 className="text-lg font-semibold">Categorie</h2>
            <p className="text-sm text-muted">Crea le categorie mostrate nello shop riservato.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label="Nuova categoria"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Categoria"
            />
            <Button type="button" onClick={handleCreateCategory} disabled={categorySaving} className="w-full sm:w-auto">
              Aggiungi
            </Button>
          </div>
        </div>
        {categories.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {category.name}
                <button
                  type="button"
                  className="text-xs text-muted hover:text-fog"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  Rimuovi
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Nuovo prodotto</h2>
            <p className="text-sm text-muted">Aggiungi un prodotto al catalogo.</p>
          </div>
          <p className="text-xs text-muted">Immagini obbligatorie, max 1 MB ciascuna.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            label="Nome prodotto"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome breve"
          />
          <Input
            label="Prezzo base (€)"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="0.00"
            type="text"
            inputMode="decimal"
          />
          <CategorySelect
            categories={categories}
            value={form.categoryId}
            onChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Descrizione (opzionale)"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrivi il prodotto"
            />
          </div>
          <div className="md:col-span-2">
            <OptionsEditor
              options={form.options}
              onChange={(options) => setForm((prev) => ({ ...prev, options }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="upload-surface w-full min-w-0 cursor-pointer">
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  setFormError(null);
                  setImageUploading(true);
                  try {
                    const uploads = await uploadImageFiles(files);
                    setForm((prev) => ({
                      ...prev,
                      imageUrls: [...prev.imageUrls, ...uploads.map((item) => item.previewUrl)],
                      imagePaths: [...prev.imagePaths, ...uploads.map((item) => item.pathRef)]
                    }));
                  } catch (err) {
                    setFormError(getErrorMessage(err, "Upload immagini non riuscito."));
                  } finally {
                    setImageUploading(false);
                    if (e.currentTarget) {
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Carica immagini</p>
                  <p className="text-xs text-muted">Seleziona piu foto. Max 1 MB ciascuna.</p>
                </div>
                <span className="upload-action shrink-0 self-start sm:self-center">Scegli foto</span>
              </div>
            </label>
            {imageUploading ? (
              <p className="mt-2 text-xs text-muted">Caricamento immagini in corso...</p>
            ) : null}
            {form.imageUrls.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {form.imageUrls.map((url, index) => (
                  <div
                    key={`new-${index}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Anteprima ${index + 1}`}
                      className="h-28 w-full object-contain"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-fog opacity-0 transition group-hover:opacity-100"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          imageUrls: prev.imageUrls.filter((_, i) => i !== index),
                          imagePaths: prev.imagePaths.filter((_, i) => i !== index)
                        }))
                      }
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="upload-surface w-full min-w-0 cursor-pointer">
              <input
                className="sr-only"
                type="file"
                accept="video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFormError(null);
                  setVideoUploading(true);
                  try {
                    const uploaded = await uploadVideoFile(file);
                    setForm((prev) => ({
                      ...prev,
                      videoUrl: uploaded.previewUrl,
                      videoPath: uploaded.pathRef
                    }));
                  } catch (err) {
                    setFormError(getErrorMessage(err, "Upload video non riuscito."));
                  } finally {
                    setVideoUploading(false);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Carica video</p>
                  <p className="text-xs text-muted">Opzionale, max 200 MB.</p>
                </div>
                <span className="upload-action shrink-0 self-start sm:self-center">Scegli video</span>
              </div>
            </label>
            {videoUploading ? (
              <p className="mt-2 text-xs text-muted">Caricamento video in corso...</p>
            ) : null}
            {form.videoUrl ? (
              <div className="mt-4 grid gap-3">
                <video
                  controls
                  className="max-h-48 w-full rounded-2xl border border-white/10 bg-slate-950 object-contain"
                  src={form.videoUrl}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, videoUrl: "", videoPath: "" }))}
                >
                  Rimuovi video
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        {formError ? <p className="mt-4 text-sm text-ember">{formError}</p> : null}
        {status ? <p className="mt-2 text-sm text-fog">{status}</p> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={handleCreate} disabled={saving || videoUploading || imageUploading} className="w-full sm:w-auto">
            Pubblica prodotto
          </Button>
        </div>
      </Card>

      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nessun prodotto pubblicato.</p>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {products.map((product) => {
            const isEditing = editingId === product.id;
            const draft = isEditing && editDraft ? editDraft : null;
            const preview =
              (Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                ? product.imageUrls[0]
                : product.imageUrl) ?? "";
            return (
              <Card
                key={product.id}
                className={`flex min-w-0 flex-col gap-4 overflow-hidden ${isEditing ? "lg:col-span-2" : ""}`}
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">
                      {categoryNameFor(product.categoryId)}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{product.name}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {!isEditing ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(product)} className="w-full sm:w-auto">
                        Modifica
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="w-full sm:w-auto"
                    >
                      Elimina
                    </Button>
                  </div>
                </div>

                {!isEditing ? (
                  <div className="grid gap-4">
                    <div className="h-40 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt={product.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                          Nessuna immagine
                        </div>
                      )}
                    </div>
                    {product.description ? (
                      <p className="text-sm text-muted">{product.description}</p>
                    ) : null}
                    <p className="text-base font-semibold">{formatEuro(product.price)}</p>
                    {product.options?.length ? (
                      <div className="grid gap-2">
                        {product.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="break-words">
                              {option.name}
                              {option.quantity ? ` - ${option.quantity}` : ""}
                            </span>
                            <span className="font-semibold">{formatEuro(option.price)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {product.videoUrl ? (
                      <p className="text-xs text-emerald-300">Video disponibile</p>
                    ) : null}
                  </div>
                ) : draft ? (
                  <div className="min-w-0 grid gap-4 md:grid-cols-2">
                    <Input
                      label="Nome"
                      value={draft.name}
                      onChange={(e) =>
                        setEditDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                      }
                    />
                    <Input
                      label="Prezzo base (€)"
                      value={draft.price}
                      onChange={(e) =>
                        setEditDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))
                      }
                      type="text"
                      inputMode="decimal"
                    />
                    <CategorySelect
                      categories={categories}
                      value={draft.categoryId}
                      onChange={(value) =>
                        setEditDraft((prev) => (prev ? { ...prev, categoryId: value } : prev))
                      }
                    />
                    <div className="md:col-span-2">
                      <Textarea
                        label="Descrizione (opzionale)"
                        value={draft.description}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, description: e.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="min-w-0 md:col-span-2">
                      <OptionsEditor
                        options={draft.options}
                        onChange={(options) =>
                          setEditDraft((prev) => (prev ? { ...prev, options } : prev))
                        }
                      />
                    </div>
                    <div className="min-w-0 md:col-span-2">
                      <label className="upload-surface w-full min-w-0 cursor-pointer">
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (!files.length) return;
                            setEditError(null);
                            setEditImageUploading(true);
                            try {
                              const uploads = await uploadImageFiles(files);
                              setEditDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      imageUrls: [
                                        ...prev.imageUrls,
                                        ...uploads.map((item) => item.previewUrl)
                                      ],
                                      imagePaths: [
                                        ...prev.imagePaths,
                                        ...uploads.map((item) => item.pathRef)
                                      ]
                                    }
                                  : prev
                              );
                            } catch (err) {
                              setEditError(getErrorMessage(err, "Upload immagini non riuscito."));
                            } finally {
                              setEditImageUploading(false);
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Carica immagini</p>
                            <p className="text-xs text-muted">
                              Seleziona piu foto. Max 1 MB ciascuna.
                            </p>
                          </div>
                          <span className="upload-action shrink-0 self-start sm:self-center">Scegli foto</span>
                        </div>
                      </label>
                      {editImageUploading ? (
                        <p className="mt-2 text-xs text-muted">Caricamento immagini in corso...</p>
                      ) : null}
                      {draft.imageUrls.length ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                          {draft.imageUrls.map((url, index) => (
                            <div
                              key={`edit-${product.id}-${index}`}
                              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Anteprima ${index + 1}`}
                                className="h-28 w-full object-contain"
                              />
                              <button
                                type="button"
                                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-fog opacity-0 transition group-hover:opacity-100"
                                onClick={() =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          imageUrls: prev.imageUrls.filter((_, i) => i !== index),
                                          imagePaths: prev.imagePaths.filter((_, i) => i !== index)
                                        }
                                      : prev
                                  )
                                }
                              >
                                Rimuovi
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 md:col-span-2">
                      <label className="upload-surface w-full min-w-0 cursor-pointer">
                        <input
                          className="sr-only"
                          type="file"
                          accept="video/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setEditError(null);
                            setEditVideoUploading(true);
                            try {
                              const uploaded = await uploadVideoFile(file);
                              setEditDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      videoUrl: uploaded.previewUrl,
                                      videoPath: uploaded.pathRef
                                    }
                                  : prev
                              );
                            } catch (err) {
                              setEditError(getErrorMessage(err, "Upload video non riuscito."));
                            } finally {
                              setEditVideoUploading(false);
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Carica video</p>
                            <p className="text-xs text-muted">Opzionale, max 200 MB.</p>
                          </div>
                          <span className="upload-action shrink-0 self-start sm:self-center">Scegli video</span>
                        </div>
                      </label>
                      {editVideoUploading ? (
                        <p className="mt-2 text-xs text-muted">Caricamento video in corso...</p>
                      ) : null}
                      {draft.videoUrl ? (
                        <div className="mt-4 grid gap-3">
                          <video
                            controls
                            className="max-h-48 w-full rounded-2xl border border-white/10 bg-slate-950 object-contain"
                            src={draft.videoUrl}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() =>
                              setEditDraft((prev) =>
                                prev ? { ...prev, videoUrl: "", videoPath: "" } : prev
                              )
                            }
                          >
                            Rimuovi video
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {editError ? (
                      <p className="text-sm text-ember md:col-span-2">{editError}</p>
                    ) : null}
                    <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
                      <Button
                        type="button"
                        onClick={handleUpdate}
                        disabled={
                          updatingId === product.id || editVideoUploading || editImageUploading
                        }
                        className="w-full sm:w-auto"
                      >
                        Salva modifiche
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit} className="w-full sm:w-auto">
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
