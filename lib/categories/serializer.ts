import { decryptString } from "../crypto/data";

export type SerializedCategory = {
  id: string;
  name: string;
};

export async function serializeCategory(category: any): Promise<SerializedCategory> {
  try {
    return {
      id: String(category?._id ?? category?.id ?? ""),
      name: await decryptString(category?.name ?? "")
    };
  } catch (error) {
    console.error("Errore durante la serializzazione della categoria:", error instanceof Error ? error.message : String(error));
    return {
      id: String(category?._id ?? category?.id ?? ""),
      name: "Categoria (Corrotta)"
    };
  }
}
