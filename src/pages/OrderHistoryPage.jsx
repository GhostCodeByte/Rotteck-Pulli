import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ORDER_HISTORY_STORAGE_KEY,
  clearOrderHistory,
  formatOrderDateTime,
  loadOrderHistory,
} from "../utils/orderHistory.js";

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

  const subtitle = useMemo(() => {
    if (!hasEntries) {
      return "Sobald du eine Bestellung abschließt, erscheint sie hier.";
    }
    return "Diese Bestellungen sind nur auf diesem Gerät gespeichert.";
  }, [hasEntries]);

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

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 shadow-inner shadow-black/30 transition hover:border-[rgb(204,31,47)]/60 hover:bg-white/10"
        >
          Zur Startseite
        </Link>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 shadow-inner shadow-black/30 transition hover:border-white/30 hover:bg-white/10"
        >
          Aktualisieren
        </button>
        {hasEntries && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 shadow-inner shadow-black/40 transition hover:border-red-300/60 hover:bg-red-500/20"
          >
            Verlauf löschen
          </button>
        )}
      </div>

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
          {history.map((entry) => (
            <li
              key={`${entry.orderCode}-${entry.createdAt}`}
              className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-inner shadow-black/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-lg font-semibold tracking-wide text-white">
                  {entry.orderCode}
                </span>
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Gespeichert
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-white">{entry.email}</span>
                <span className="text-white/60">
                  {formatOrderDateTime(entry.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
