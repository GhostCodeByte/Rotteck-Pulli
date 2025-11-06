import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import {
  addOrderToHistory,
  formatOrderDateTime,
  loadOrderHistory,
} from "../utils/orderHistory.js";
import { fetchOrderStatuses } from "../utils/orderStatus.js";

export default function OrderSuccessPage() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return <Navigate to="/" replace />;
  }

  const orderTimestamp = order.createdAt ?? new Date().toISOString();
  const createdAt = useMemo(
    () => formatOrderDateTime(orderTimestamp),
    [orderTimestamp]
  );

  const [copyStatus, setCopyStatus] = useState("idle");
  const [history, setHistory] = useState(() => loadOrderHistory());
  const [orderDetails, setOrderDetails] = useState({});
  const [selectedOrderCode, setSelectedOrderCode] = useState(null);

  useEffect(() => {
    if (!order?.orderCode) return;

    const updated = addOrderToHistory({
      orderCode: order.orderCode,
      email: order.email,
      createdAt: orderTimestamp,
    });
    setHistory(updated);
  }, [order?.orderCode, order?.email, orderTimestamp]);

  useEffect(() => {
    if (!history.length) {
      setOrderDetails({});
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;

    (async () => {
      const results = await fetchOrderStatuses(history, {
        signal: controller.signal,
      });

      if (isCancelled) return;

      const next = {};
      results.forEach((item) => {
        if (!item?.orderCode) return;
        next[item.orderCode] = item;
      });
      setOrderDetails(next);
    })();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [history]);

  useEffect(() => {
    if (copyStatus === "idle") return;

    const timeoutId = setTimeout(() => setCopyStatus("idle"), 1800);
    return () => clearTimeout(timeoutId);
  }, [copyStatus]);

  const handleCopy = async () => {
    if (!order?.orderCode) return;

    try {
      const clipboard =
        typeof navigator !== "undefined" ? navigator.clipboard : null;

      if (clipboard?.writeText) {
        await clipboard.writeText(order.orderCode);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = order.orderCode;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.opacity = "0";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        throw new Error("Clipboard API nicht verfügbar");
      }

      setCopyStatus("success");
    } catch (error) {
      console.warn("Bestellcode konnte nicht kopiert werden:", error);
      setCopyStatus("error");
    }
  };

  const copyLabel =
    copyStatus === "success"
      ? "Kopiert!"
      : copyStatus === "error"
        ? "Fehler beim Kopieren"
        : "Code kopieren";

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6 text-white">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Bestellung gespeichert</h1>
        <p className="text-sm text-white/70">
          Wir haben deine Bestellung erhalten. Bitte gib bei der Überweisung den
          folgenden Bestellcode an, damit wir deine Zahlung zuordnen können.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-emerald-100 shadow-lg shadow-emerald-900/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <code className="inline-flex w-full flex-1 items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-600/20 px-6 py-3 text-center text-xl font-semibold tracking-wide text-emerald-50 shadow-inner shadow-emerald-900/30">
            {order.orderCode}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/50 bg-emerald-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-50 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
          >
            {copyLabel}
          </button>
        </div>
        <span
          className="text-xs text-emerald-100/80"
          aria-live="polite"
          role="status"
        >
          {copyStatus === "success"
            ? "Der Bestellcode wurde in die Zwischenablage kopiert."
            : copyStatus === "error"
              ? "Der Bestellcode konnte nicht automatisch kopiert werden. Bitte kopiere ihn manuell."
              : ""}
        </span>
        <p className="text-xs text-emerald-100/80">
          Gespeichert für {" "}
          <span className="font-medium text-emerald-50">{order.email}</span> am {" "}
          {createdAt}
        </p>
      </div>

      <Link
        to="/"
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-black/45 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        Zur Startseite
      </Link>

      {history.length > 0 && (
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-inner shadow-black/40">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Letzte Bestellungen</h2>
          </div>
          <ol className="flex flex-col gap-3">
            {history.map((entry) => {
              const isCurrent = entry.orderCode === order.orderCode;
              const details = orderDetails[entry.orderCode];
              const status = details?.status ?? "pending";

              const statusLabel =
                status === "paid"
                  ? "Bezahlt"
                  : status === "unauthorised"
                    ? "Angaben stimmen nicht"
                    : status === "unknown"
                      ? "Status unbekannt"
                      : "Noch zu bezahlen...";

              const statusClasses =
                status === "paid"
                  ? "text-emerald-200"
                  : status === "unauthorised"
                    ? "text-amber-200"
                    : status === "unknown"
                      ? "text-white/60"
                      : "text-red-200";

              return (
                <li
                  key={`${entry.orderCode}-${entry.createdAt}`}
                  className={`rounded-2xl border shadow transition ${
                    isCurrent
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-50 shadow-emerald-900/30"
                      : "border-white/10 bg-white/10 text-white/80 shadow-black/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedOrderCode(entry.orderCode)}
                    className="flex w-full flex-col gap-2 rounded-2xl px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-base font-semibold tracking-wide text-white">
                        {entry.orderCode}
                      </span>
                      <span className={`text-sm font-medium ${statusClasses}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-white/80 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium text-white">
                        {entry.email}
                      </span>
                      <span className="text-white/60">
                        {formatOrderDateTime(entry.createdAt)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {selectedOrderCode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gray-950/95 p-6 text-white shadow-2xl shadow-black/70">
            <button
              type="button"
              onClick={() => setSelectedOrderCode(null)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/30 hover:text-white"
              aria-label="Details schließen"
            >
              <span className="text-lg">x</span>
            </button>

            <div className="flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold">Bestellung {selectedOrderCode}</h3>
                {(() => {
                  const details = orderDetails[selectedOrderCode];
                  const status = details?.status ?? "pending";
                  const label =
                    status === "paid"
                      ? "Bezahlt"
                      : status === "unauthorised"
                        ? "Angaben stimmen nicht"
                        : status === "unknown"
                          ? "Status unbekannt"
                          : "Noch zu bezahlen...";

                  return (
                    <span className="text-sm text-white/70">Status: {label}</span>
                  );
                })()}
              </header>

              {(() => {
                const details = orderDetails[selectedOrderCode];
                const entry = history.find((item) => item.orderCode === selectedOrderCode);

                return (
                  <div className="flex flex-col gap-2 text-sm text-white/70">
                    <span className="font-medium text-white">{entry?.email}</span>
                    {details?.createdAt ? (
                      <span>Erstellt: {formatOrderDateTime(details.createdAt)}</span>
                    ) : null}
                    {details?.updatedAt ? (
                      <span>Aktualisiert: {formatOrderDateTime(details.updatedAt)}</span>
                    ) : null}
                  </div>
                );
              })()}

              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <span className="text-sm font-semibold uppercase tracking-wide text-white">
                  Artikelübersicht
                </span>
                {(() => {
                  const details = orderDetails[selectedOrderCode];
                  if (!details?.items?.length) {
                    return (
                      <p className="text-sm text-white/60">
                        Keine Artikeldetails gefunden.
                      </p>
                    );
                  }

                  return (
                    <ul className="flex flex-col gap-2">
                      {details.items.map((item, index) => (
                        <li
                          key={`${selectedOrderCode}-${index}`}
                          className="flex flex-col gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <span className="text-sm font-semibold text-white">
                            {(item?.product ?? "Pulli").toString()} x {item?.quantity ?? 1}
                          </span>
                          <span className="text-xs text-white/60">
                            Farbe: {item?.color ?? "unbekannt"} · Größe: {item?.size ?? "unbekannt"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
