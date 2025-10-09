import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CartContext = createContext(undefined);
const CART_STORAGE_KEY = "rotteck-pulli-cart";

const isBrowser = typeof window !== "undefined";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseStoredItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const map = new Map();
  rawItems.forEach((entry) => {
    if (!entry) return;
    const color = entry.color ?? entry.variant ?? entry?.colour;
    const size = entry.size ?? entry?.variantSize;
    if (!color || !size) return;

    const quantity = Number(entry.quantity ?? 1);
    const key = `${color}__${size}`;
    if (!map.has(key)) {
      map.set(key, {
        id: entry.id ?? generateId(),
        color,
        size,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        studentName:
          typeof entry.studentName === "string"
            ? entry.studentName.slice(0, 140)
            : "",
      });
    } else {
      const current = map.get(key);
      current.quantity +=
        Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      if (!current.studentName && typeof entry.studentName === "string") {
        current.studentName = entry.studentName;
      }
    }
  });

  return Array.from(map.values());
}

function readStoredState() {
  if (!isBrowser)
    return {
      items: [],
      customerEmail: "",
    };
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw)
      return {
        items: [],
        customerEmail: "",
      };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        items: normaliseStoredItems(parsed),
        customerEmail: "",
      };
    }
    if (parsed && typeof parsed === "object") {
      const items = normaliseStoredItems(parsed.items ?? parsed.products ?? []);
      const customerEmail =
        typeof parsed.customerEmail === "string"
          ? parsed.customerEmail.slice(0, 256)
          : "";
      return {
        items,
        customerEmail,
      };
    }
    return {
      items: [],
      customerEmail: "",
    };
  } catch (error) {
    console.warn("Konnte gespeicherten Warenkorb nicht lesen:", error);
    return {
      items: [],
      customerEmail: "",
    };
  }
}

function writeStoredState(items, customerEmail) {
  if (!isBrowser) return;
  try {
    const payload = {
      items,
      customerEmail: typeof customerEmail === "string" ? customerEmail : "",
      version: 2,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Konnte Warenkorb nicht speichern:", error);
  }
}

export function CartProvider({ children }) {
  const initialStateRef = useRef(readStoredState());
  const [items, setItems] = useState(initialStateRef.current.items);
  const [customerEmail, setCustomerEmail] = useState(
    initialStateRef.current.customerEmail ?? ""
  );

  useEffect(() => {
    writeStoredState(items, customerEmail);
  }, [items, customerEmail]);

  const addItem = useCallback(({ color, size }) => {
    if (!color || !size) return;
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => entry.color === color && entry.size === size
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [
        ...prev,
        { id: generateId(), color, size, quantity: 1, studentName: "" },
      ];
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    setItems((prev) => {
      const next = prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(0, Number(quantity) || 0),
              }
            : item
        )
        .filter((item) => item.quantity > 0);
      return next;
    });
  }, []);

  const updateStudentName = useCallback((id, name) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              studentName:
                typeof name === "string" ? name.slice(0, 140) : "",
            }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const updateCustomerEmail = useCallback((value) => {
    setCustomerEmail((prev) => {
      const nextValue =
        typeof value === "function" ? value(prev) : value ?? "";
      if (typeof nextValue !== "string") return "";
      return nextValue.trim().slice(0, 256);
    });
  }, []);

  const count = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      updateStudentName,
      updateCustomerEmail,
      customerEmail,
      clearCart,
      count,
    }),
    [
      items,
      count,
      addItem,
      updateQuantity,
      updateStudentName,
      updateCustomerEmail,
      customerEmail,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error(
      "useCart muss innerhalb eines CartProvider verwendet werden"
    );
  }
  return context;
}
