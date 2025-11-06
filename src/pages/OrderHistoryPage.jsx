import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ORDER_HISTORY_STORAGE_KEY,
  clearOrderHistory,
  formatOrderDateTime,
  loadOrderHistory,
} from "../utils/orderHistory.js";
import { fetchOrderStatuses } from "../utils/orderStatus.js";

function useOrderHistory() {
  const [history, setHistory] = useState(() => loadOrderHistory());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event) => {
      if (event.key && event.key !== ORDER_HISTORY_STORAGE_KEY) return;
      setHistory(loadOrderHistory());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const refresh = () => setHistory(loadOrderHistory());
  return { history, setHistory, refresh };
}

export default function OrderHistoryPage() {
  const { history, setHistory, refresh } = useOrderHistory();
  const hasEntries = history.length > 0;
  const [orderDetails, setOrderDetails] = useState({});
  const [selectedOrderCode, setSelectedOrderCode] = useState(null);

  const subtitle = useMemo(() => {
    if (!hasEntries) {
      return "Sobald du eine Bestellung abschließt, erscheint sie hier.";
    }
    return "Tippe auf eine Bestellung, um Details zu sehen.";
  }, [hasEntries]);

  useEffect(() => {
    if (!history.length) {
      setOrderDetails({});
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const results = await fetchOrderStatuses(history, {
        signal: controller.signal,
      });

      if (cancelled) return;

      const map = {};
      results.forEach((item) => {
        if (!item?.orderCode) return;
        map[item.orderCode] = item;
      });
      setOrderDetails(map);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [history]);

  const handleClear = () => {
    clearOrderHistory();
    setHistory([]);
  };

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6 text-white">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Letzte Bestellungen</h1>
        <p className="text-sm text-white/70">{subtitle}</p>
      </header>

      {/* Aktionen (Zur Startseite / Aktualisieren / Verlauf löschen) entfernt auf Wunsch */}

      {!hasEntries ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 shadow-inner shadow-black/40">
          <p className="text-sm">
            Du hast noch keine Bestellungen auf diesem Gerät abgeschlossen.
          </p>
          <p className="text-sm">
            Nach jeder Bestellung speichern wir den Code und die verwendete E-Mail hier, damit du sie später schnell wieder findest.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {history.map((entry) => {
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
                className="rounded-3xl border border-white/10 bg-white/5 text-white/80 shadow-inner shadow-black/40"
              >
                <button
                  type="button"
                  onClick={() => setSelectedOrderCode(entry.orderCode)}
                  className="flex w-full flex-col gap-3 rounded-3xl px-6 py-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg font-semibold tracking-wide text-white">
                      {entry.orderCode}
                    </span>
                    <span className={`text-sm font-medium ${statusClasses}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-white/80 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium text-white">{entry.email}</span>
                    <span className="text-white/60">
                      {formatOrderDateTime(entry.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
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
