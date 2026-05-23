import { z } from "zod";

export const accessPinSchema = z.object({
  pin: z.string().min(4).max(64)
});

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
  pinOrPassphrase: z.string().min(4).max(128),
  publicKey: z.string().min(20),
  privateKeyEncrypted: z.string().min(20),
  privateKeyIv: z.string().min(12),
  kdfSalt: z.string().min(12)
});

export const loginStep1Schema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
  role: z.enum(["user", "admin"])
});

export const loginStep2Schema = z.object({
  pinOrPassphrase: z.string().min(4).max(128)
});

export const requestSchema = z.object({
  products: z.array(
    z.object({
      productId: z.string().min(12),
      optionId: z.string().min(12).optional(),
      quantity: z.number().int().min(1).max(20)
    })
  ),
  totalPrice: z.number().min(0),
  customMessageCiphertext: z.string().min(10),
  customMessageIv: z.string().min(10),
  customMessageEncryptedSymKey: z.string().min(10)
});

export const categoryCreateSchema = z.object({
  name: z.string().min(2).max(64)
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2).max(64)
});

const productOptionSchema = z.object({
  id: z.string().min(12).optional(),
  name: z.string().min(2).max(80),
  quantity: z.string().max(60).optional(),
  price: z.number().min(0)
});

export const messageSchema = z.object({
  receiverId: z.string().min(12),
  ciphertext: z.string().min(10),
  iv: z.string().min(10),
  encryptedSymKey: z.string().min(10)
});

export const adminCreateSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
  pinOrPassphrase: z.string().min(4).max(128),
  publicKey: z.string().min(20),
  privateKeyEncrypted: z.string().min(20),
  privateKeyIv: z.string().min(12),
  kdfSalt: z.string().min(12)
});

export const adminUpdateSchema = z.object({
  password: z.string().min(8).max(128).optional(),
  pinOrPassphrase: z.string().min(4).max(128).optional(),
  disabled: z.boolean().optional(),
  publicKey: z.string().min(20).optional(),
  privateKeyEncrypted: z.string().min(20).optional(),
  privateKeyIv: z.string().min(12).optional(),
  kdfSalt: z.string().min(12).optional()
});

export const productCreateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).default(""),
  price: z.number().min(0),
  categoryId: z.string().min(12).nullable().optional(),
  options: z.array(productOptionSchema).max(20).optional(),
  imageUrls: z.array(z.string().max(2000000)).min(1).optional(),
  imageUrl: z.string().max(2000000).optional(),
  videoUrl: z.string().max(10000000).optional()
}).refine((data) => (data.imageUrls && data.imageUrls.length > 0) || data.imageUrl, {
  message: "Immagini obbligatorie",
  path: ["imageUrls"]
});

export const productUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(280).optional(),
  price: z.number().min(0).optional(),
  categoryId: z.string().min(12).nullable().optional(),
  options: z.array(productOptionSchema).max(20).optional(),
  imageUrls: z.array(z.string().max(2000000)).min(1).optional(),
  imageUrl: z.string().max(2000000).optional(),
  videoUrl: z.string().max(10000000).optional()
});
