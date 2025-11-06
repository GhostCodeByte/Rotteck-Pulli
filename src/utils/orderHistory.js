const HISTORY_STORAGE_KEY = "rotteck-pulli:order-history";
export const ORDER_HISTORY_STORAGE_KEY = HISTORY_STORAGE_KEY;
const MAX_HISTORY_ENTRIES = 5;

function canUseLocalStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function safeParseHistory(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Konnte Bestellhistorie nicht lesen:", error);
    return [];
  }
}

export function loadOrderHistory() {
  if (!canUseLocalStorage()) return [];

  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];

  return safeParseHistory(raw);
}

export function persistOrderHistory(entries) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(entries ?? [])
    );
  } catch (error) {
    console.warn("Konnte Bestellhistorie nicht speichern:", error);
  }
}

export function addOrderToHistory(order) {
  if (!order?.orderCode) return loadOrderHistory();

  const entry = {
    orderCode: order.orderCode,
    email: order.email ?? "",
    createdAt: order.createdAt ?? new Date().toISOString(),
  };

  const existing = loadOrderHistory();
  const filtered = existing.filter((item) => item.orderCode !== entry.orderCode);
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY_ENTRIES);
  persistOrderHistory(updated);
  return updated;
}

export function formatOrderDateTime(value) {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("de-DE");
  } catch (error) {
    return value;
  }
}

export function clearOrderHistory() {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.warn("Konnte Bestellhistorie nicht löschen:", error);
  }
}
