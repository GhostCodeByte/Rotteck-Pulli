import { useMemo } from "react";

import { useCart } from "../context/CartContext.jsx";
import {
  COLOR_VARIANTS,
  VARIANT_IMAGES,
  PRICE_IN_EURO,
} from "../data/productData.js";

export default function CartPage() {
  const { items, updateQuantity, updateStudentName } = useCart();

  const variantLookup = useMemo(() => {
    const map = new Map();
    COLOR_VARIANTS.forEach((variant) => {
      map.set(variant.key, variant.label);
    });
    return map;
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex w-full max-w-3xl flex-col items-center gap-4 text-center text-white/70">
        <h1 className="text-2xl font-semibold text-white">Warenkorb</h1>
        <p>Dein Warenkorb ist derzeit leer.</p>
      </div>
    );
  }

  const totalQuantity = items.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0
  );

  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity ?? 0) * PRICE_IN_EURO,
    0
  );

  const highestQuantity = items.reduce(
    (max, item) => Math.max(max, item.quantity ?? 0),
    0
  );
  const maxQuantityOption = Math.max(10, highestQuantity);

  const quantityOptions = Array.from(
    { length: maxQuantityOption },
    (_, index) => index + 1
  );

  return (
    <section className="flex w-full max-w-4xl flex-col gap-6 text-white">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Warenkorb</h1>
        <span className="text-sm text-white/60">
          {totalQuantity} Artikel insgesamt
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {items.map((item) => {
          const previewSrc = VARIANT_IMAGES[item.color]?.[0];
          const colorLabel = variantLookup.get(item.color) ?? item.color;
          const lineTotal = (item.quantity ?? 0) * PRICE_IN_EURO;

          return (
            <li
              key={item.id}
              className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex w-full items-center justify-center sm:w-auto">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-gray-900/80">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt={`${colorLabel} Vorschau`}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-xs text-white/40">Kein Bild</span>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col gap-4">
                <p className="text-base font-semibold text-white">
                  <span className="text-white/60">Farbe:</span> {colorLabel}
                  <span className="mx-2 text-white/40">·</span>
                  <span className="text-white/60">Größe:</span> {item.size}
                </p>

                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Schüler Name
                  <input
                    type="text"
                    value={item.studentName ?? ""}
                    onChange={(event) =>
                      updateStudentName(item.id, event.target.value)
                    }
                    placeholder="Schüler Name"
                    className="w-full rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
                  />
                </label>
              </div>

              <div className="flex w-full flex-col gap-3 text-sm text-white/70 sm:w-48 sm:items-end">
                <div className="flex flex-col gap-1 sm:items-end">
                  <span>Menge</span>
                  <select
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(item.id, Number(event.target.value))
                    }
                    className="w-28 rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-2 text-sm font-semibold text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
                  >
                    {quantityOptions.map((option) => (
                      <option
                        key={option}
                        value={option}
                        className="bg-gray-900 text-white"
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                    Preis
                  </span>
                  <div className="rounded-2xl bg-white/10 px-4 py-2 text-right text-sm font-semibold text-white">
                    {lineTotal.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-end gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-lg shadow-black/30 backdrop-blur-sm">
        <span className="text-sm text-white/60">Gesamtsumme</span>
        <span className="text-2xl font-semibold text-white">
          {subtotal.toLocaleString("de-DE", {
            style: "currency",
            currency: "EUR",
          })}
        </span>
      </div>
    </section>
  );
}
