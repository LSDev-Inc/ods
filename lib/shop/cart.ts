export type CartItem = {
  productId: string;
  optionId?: string;
  quantity: number;
};

export const CART_STORAGE_KEY = "ods.cart.v1";
export const CART_UPDATED_EVENT = "ods-cart-updated";

export function cartItemKey(item: Pick<CartItem, "productId" | "optionId">) {
  return `${item.productId}:${item.optionId ?? "base"}`;
}

export function readCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item) =>
          typeof item?.productId === "string" &&
          (item.optionId === undefined || typeof item.optionId === "string") &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      )
      .map((item) => ({
        productId: item.productId,
        optionId: item.optionId,
        quantity: Math.min(item.quantity, 20)
      }));
  } catch {
    return [];
  }
}

export function writeCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return;

  const normalized = items
    .filter((item) => item.productId && item.quantity > 0)
    .map((item) => ({
      productId: item.productId,
      optionId: item.optionId,
      quantity: Math.min(Math.max(Math.trunc(item.quantity), 1), 20)
    }));

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addCartItem(productId: string, optionId?: string, delta = 1) {
  const items = readCartItems();
  const key = cartItemKey({ productId, optionId });
  const current = items.find((item) => cartItemKey(item) === key);

  if (current) {
    current.quantity = Math.min(Math.max(current.quantity + delta, 0), 20);
  } else if (delta > 0) {
    items.push({ productId, optionId, quantity: Math.min(delta, 20) });
  }

  writeCartItems(items.filter((item) => item.quantity > 0));
}

export function clearCartItems() {
  writeCartItems([]);
}
