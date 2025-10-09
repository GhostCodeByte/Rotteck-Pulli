import { useMemo, useState } from "react";

import { useCart } from "../context/CartContext.jsx";
import {
  COLOR_VARIANTS,
  VARIANT_IMAGES,
  PRICE_IN_EURO,
} from "../data/productData.js";
import { useCheckout } from "../hooks/useCheckout.js";

const PRODUCT_NAME = "Pulli";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CartPage() {
  const { items, updateQuantity, updateCustomerEmail, customerEmail, clearCart } =
    useCart();

  const {
    submitOrder,
    isLoading: isSubmitting,
    isError: isCheckoutError,
    error: checkoutError,
  } = useCheckout();

  const [emailError, setEmailError] = useState("");
  const [orderReceipt, setOrderReceipt] = useState(null);

  const hasItems = items.length > 0;

  const variantLookup = useMemo(() => {
    const map = new Map();
    COLOR_VARIANTS.forEach((variant) => {
      map.set(variant.key, variant.label);
    });
    return map;
  }, []);

  const totalQuantity = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Math.max(0, Math.floor(item.quantity ?? 0)),
        0
      ),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Math.max(0, Math.floor(item.quantity ?? 0)) * PRICE_IN_EURO,
        0
      ),
    [items]
  );

  const highestQuantity = useMemo(
    () =>
      items.reduce(
        (max, item) =>
          Math.max(max, Math.max(0, Math.floor(item.quantity ?? 0))),
        0
      ),
    [items]
  );

  const quantityOptions = useMemo(() => {
    const maxQuantityOption = Math.max(10, highestQuantity || 1);
    return Array.from({ length: maxQuantityOption }, (_, index) => index + 1);
  }, [highestQuantity]);

  const handlePurchase = async () => {
    setEmailError("");

    const trimmedEmail = (customerEmail ?? "").trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Bitte gib eine gültige E-Mail-Adresse an.");
      return;
    }

    if (!hasItems) {
      return;
    }

    const payload = {
      email: trimmedEmail,
      items: items.map((item) => ({
        product: PRODUCT_NAME,
        color: item.color,
        size: item.size,
        quantity: Math.max(1, Math.floor(item.quantity ?? 1)),
      })),
    };

    const response = await submitOrder(payload);
    if (response?.orderCode) {
      setOrderReceipt({
        orderCode: response.orderCode,
        email: trimmedEmail,
        createdAt: response.createdAt ?? new Date().toISOString(),
      });
      clearCart();
      updateCustomerEmail("");
    }
  };

  return (
    <section className="flex w-full max-w-4xl flex-col gap-6 text-white">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Warenkorb</h1>
        {hasItems ? (
          <span className="text-sm text-white/60">
            {totalQuantity} Artikel insgesamt
          </span>
        ) : (
          <span className="text-sm text-white/60">
            Füge Artikel hinzu, um eine Bestellung zu starten.
          </span>
        )}
      </div>

      {orderReceipt && (
        <div className="flex flex-col gap-3 rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-emerald-100 shadow-lg shadow-emerald-900/30">
          <h2 className="text-lg font-semibold text-emerald-100">
            Bestellung gespeichert
          </h2>
          <p className="text-sm">
            Wir haben deine Bestellung erhalten. Bitte gib bei der Überweisung
            folgenden Bestellcode an, damit wir deine Zahlung zuordnen können:
          </p>
          <code className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-600/20 px-4 py-2 text-lg font-semibold tracking-wide">
            {orderReceipt.orderCode}
          </code>
          <p className="text-xs text-emerald-200/80">
            Gespeichert für{" "}
            <span className="font-medium">{orderReceipt.email}</span> am{" "}
            {new Date(orderReceipt.createdAt).toLocaleString("de-DE")}
          </p>
        </div>
      )}

      {hasItems ? (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((item) => {
              const previewSrc = VARIANT_IMAGES[item.color]?.[0];
              const colorLabel = variantLookup.get(item.color) ?? item.color;
              const lineTotal =
                Math.max(0, Math.floor(item.quantity ?? 0)) * PRICE_IN_EURO;

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

                  <p className="w-full text-base font-semibold text-white">
                    <span className="text-white/60">Farbe:</span> {colorLabel}
                    <span className="mx-2 text-white/40">·</span>
                    <span className="text-white/60">Größe:</span> {item.size}
                  </p>

                  <div className="flex w-full flex-col gap-3 text-sm text-white/70 sm:w-48 sm:items-end">
                    <div className="flex flex-col gap-1 sm:items-end">
                      <span>Menge</span>
                      <select
                        value={Math.max(1, Math.floor(item.quantity ?? 1))}
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
                        Zwischensumme
                      </span>
                      <span className="text-lg font-semibold text-white">
                        {lineTotal.toLocaleString("de-DE", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
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

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-black/30 backdrop-blur-sm">
            <div className="flex flex-col gap-2 text-sm text-white/80">
              <label className="flex flex-col gap-2">
                Kontakt-E-Mail
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => updateCustomerEmail(event.target.value)}
                  placeholder="dein.name@schule.de"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
                />
              </label>
              {emailError && (
                <span className="text-sm font-medium text-red-300">
                  {emailError}
                </span>
              )}
              <p className="text-xs text-white/60">
                Wir senden dir eine Erinnerung mit dem Bestellcode an diese
                E-Mail-Adresse.
              </p>
            </div>

            {isCheckoutError && checkoutError && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {checkoutError.message ??
                  "Beim Speichern deiner Bestellung ist ein Fehler aufgetreten."}
              </div>
            )}

            <button
              type="button"
              onClick={handlePurchase}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-black/45 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Bestellung wird übertragen…" : "Kaufen"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/70 shadow-inner shadow-black/40">
          <p>Dein Warenkorb ist derzeit leer.</p>
          <p className="text-sm text-white/50">
            Wähle eine Farbe und Größe auf der Produktseite aus und füge den
            Pulli deinem Warenkorb hinzu.
          </p>
        </div>
      )}
    </section>
  );
}
