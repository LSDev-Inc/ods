"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { toBlobProxyUrl, toBlobRef } from "../../lib/media";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  imageUrl?: string;
  videoUrl?: string;
  imagePaths?: string[];
  videoPath?: string;
};

type Draft = {
  name: string;
  description: string;
  price: string;
  imageUrls: string[];
  imagePaths: string[];
  videoUrl: string;
  videoPath: string;
};

const MAX_IMAGE_BYTES = 1_000_000;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  price: "",
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

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
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
    const res = await fetch("/api/products");
    if (!res.ok) {
      setError("Impossibile caricare i prodotti.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Product[];
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setFormError(null);
    setStatus(null);
    const name = form.name.trim();
    const description = form.description.trim();
    const price = toPriceNumber(form.price);
    if (!name || !description) {
      setFormError("Nome e descrizione sono obbligatori.");
      return;
    }
    if (price === null) {
      setFormError("Prezzo non valido.");
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
    if (!name || !description) {
      setEditError("Nome e descrizione sono obbligatori.");
      return;
    }
    if (price === null) {
      setEditError("Prezzo non valido.");
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

  if (loading) return <p className="text-sm text-muted">Caricamento prodotti...</p>;
  if (error) return <p className="text-sm text-ember">{error}</p>;

  return (
    <div className="grid gap-8">
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
            label="Prezzo (EUR)"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="0.00"
            type="text"
            inputMode="decimal"
          />
          <div className="md:col-span-2">
            <Textarea
              label="Descrizione"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrivi il prodotto"
            />
          </div>
          <div className="md:col-span-2">
            <label className="upload-surface cursor-pointer">
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
                    const validFiles = files.filter((file) => {
                      if (!file.type.startsWith("image/")) {
                        setFormError(`Formato immagine non valido: ${file.name}`);
                        return false;
                      }
                      if (file.size > MAX_IMAGE_BYTES) {
                        setFormError(`Immagine troppo grande: ${file.name} (max 1 MB).`);
                        return false;
                      }
                      return true;
                    });
                    if (!validFiles.length) return;
                    const { upload } = await import("@vercel/blob/client");
                    const uploads = await Promise.all(
                      validFiles.map(async (file) => {
                        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                        const blob = await upload(
                          `products/images/${Date.now()}-${safeName}`,
                          file,
                          {
                            access: "private",
                            handleUploadUrl: "/api/blob/upload"
                          }
                        );
                        const pathRef = toBlobRef(blob.pathname);
                        return {
                          pathRef,
                          previewUrl: toBlobProxyUrl(blob.pathname)
                        };
                      })
                    );
                    setForm((prev) => ({
                      ...prev,
                      imageUrls: [...prev.imageUrls, ...uploads.map((item) => item.previewUrl)],
                      imagePaths: [...prev.imagePaths, ...uploads.map((item) => item.pathRef)]
                    }));
                  } catch (err: any) {
                    setFormError(err?.message ?? "Upload immagini non riuscito.");
                  } finally {
                    setImageUploading(false);
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Carica immagini</p>
                  <p className="text-xs text-muted">
                    Seleziona piu foto. Max 1 MB ciascuna.
                  </p>
                </div>
                <span className="upload-action">Scegli foto</span>
              </div>
            </label>
            {imageUploading ? (
              <p className="mt-2 text-xs text-muted">Caricamento immagini in corso...</p>
            ) : null}
            {form.imageUrls.length ? (
              <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
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
            <label className="upload-surface cursor-pointer">
              <input
                className="sr-only"
                type="file"
                accept="video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFormError(null);
                  if (!file.type.startsWith("video/")) {
                    setFormError("Formato video non valido.");
                    return;
                  }
                  if (file.size > MAX_VIDEO_BYTES) {
                    setFormError("Video troppo grande. Max 200 MB.");
                    return;
                  }
                  setVideoUploading(true);
                  try {
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                    let pathname = `products/videos/${Date.now()}-${safeName}`;
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
                    setForm((prev) => ({
                      ...prev,
                      videoUrl: toBlobProxyUrl(pathname),
                      videoPath: toBlobRef(pathname)
                    }));
                  } catch {
                    setFormError("Upload video non riuscito.");
                  } finally {
                    setVideoUploading(false);
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Carica video</p>
                  <p className="text-xs text-muted">Opzionale, max 200 MB.</p>
                </div>
                <span className="upload-action">Scegli video</span>
              </div>
            </label>
            {videoUploading ? (
              <p className="mt-2 text-xs text-muted">Caricamento video in corso...</p>
            ) : null}
            {form.videoUrl ? (
              <div className="mt-4 grid gap-3">
                <video
                  controls
                  className="h-36 w-full rounded-2xl border border-white/10 bg-slate-950 object-contain"
                  src={form.videoUrl}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, videoUrl: "", videoPath: "" }))
                  }
                >
                  Rimuovi video
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        {formError ? <p className="mt-4 text-sm text-ember">{formError}</p> : null}
        {status ? <p className="mt-2 text-sm text-fog">{status}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handleCreate} disabled={saving || videoUploading || imageUploading}>
            Pubblica prodotto
          </Button>
        </div>
      </Card>

      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nessun prodotto pubblicato.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {products.map((product) => {
            const isEditing = editingId === product.id;
            const draft = isEditing && editDraft ? editDraft : null;
            const preview =
              (Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                ? product.imageUrls[0]
                : product.imageUrl) ?? "";
            return (
              <Card key={product.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Prodotto</p>
                    <p className="text-lg font-semibold">{product.name}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button size="sm" variant="outline" onClick={() => startEdit(product)}>
                        Modifica
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
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
                  <p className="text-sm text-muted">{product.description}</p>
                  <p className="text-base font-semibold">EUR {product.price}</p>
                  {product.videoUrl ? (
                    <p className="text-xs text-emerald-300">Video disponibile</p>
                  ) : null}
                </div>
              ) : draft ? (
                <div className="grid gap-4">
                  <Input
                    label="Nome"
                    value={draft.name}
                    onChange={(e) =>
                      setEditDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                    }
                  />
                  <Input
                    label="Prezzo (EUR)"
                    value={draft.price}
                    onChange={(e) =>
                      setEditDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))
                    }
                    type="text"
                    inputMode="decimal"
                  />
                  <Textarea
                    label="Descrizione"
                    value={draft.description}
                    onChange={(e) =>
                      setEditDraft((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
                  />
                  <div>
                    <label className="upload-surface cursor-pointer">
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
                            const validFiles = files.filter((file) => {
                              if (!file.type.startsWith("image/")) {
                                setEditError(`Formato immagine non valido: ${file.name}`);
                                return false;
                              }
                              if (file.size > MAX_IMAGE_BYTES) {
                                setEditError(`Immagine troppo grande: ${file.name} (max 1 MB).`);
                                return false;
                              }
                              return true;
                            });
                            if (!validFiles.length) return;
                            const { upload } = await import("@vercel/blob/client");
                            const uploads = await Promise.all(
                              validFiles.map(async (file) => {
                                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                                const blob = await upload(
                                  `products/images/${Date.now()}-${safeName}`,
                                  file,
                                  {
                                    access: "private",
                                    handleUploadUrl: "/api/blob/upload"
                                  }
                                );
                                const pathRef = toBlobRef(blob.pathname);
                                return {
                                  pathRef,
                                  previewUrl: toBlobProxyUrl(blob.pathname)
                                };
                              })
                            );
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
                          } catch (err: any) {
                            setEditError(err?.message ?? "Upload immagini non riuscito.");
                          } finally {
                            setEditImageUploading(false);
                          }
                        }}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Carica immagini</p>
                          <p className="text-xs text-muted">
                            Seleziona piu foto. Max 1 MB ciascuna.
                          </p>
                        </div>
                        <span className="upload-action">Scegli foto</span>
                      </div>
                    </label>
                    {editImageUploading ? (
                      <p className="mt-2 text-xs text-muted">Caricamento immagini in corso...</p>
                    ) : null}
                    {draft.imageUrls.length ? (
                      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
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
                  <div className="grid gap-3">
                    <label className="upload-surface cursor-pointer">
                      <input
                        className="sr-only"
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setEditError(null);
                          if (!file.type.startsWith("video/")) {
                            setEditError("Formato video non valido.");
                            return;
                          }
                          if (file.size > MAX_VIDEO_BYTES) {
                            setEditError("Video troppo grande. Max 200 MB.");
                            return;
                          }
                          setEditVideoUploading(true);
                          try {
                            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                            let pathname = `products/videos/${Date.now()}-${safeName}`;
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
                            setEditDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    videoUrl: toBlobProxyUrl(pathname),
                                    videoPath: toBlobRef(pathname)
                                  }
                                : prev
                            );
                          } catch {
                            setEditError("Upload video non riuscito.");
                          } finally {
                            setEditVideoUploading(false);
                          }
                        }}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Carica video</p>
                          <p className="text-xs text-muted">Opzionale, max 200 MB.</p>
                        </div>
                        <span className="upload-action">Scegli video</span>
                      </div>
                    </label>
                    {editVideoUploading ? (
                      <p className="text-xs text-muted">Caricamento video in corso...</p>
                    ) : null}
                    {draft.videoUrl ? (
                      <div className="grid gap-3">
                        <video
                          controls
                          className="h-36 w-full rounded-2xl border border-white/10 bg-slate-950 object-contain"
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
                  {editError ? <p className="text-sm text-ember">{editError}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleUpdate}
                      disabled={updatingId === product.id || editVideoUploading || editImageUploading}
                    >
                      Salva modifiche
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
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
