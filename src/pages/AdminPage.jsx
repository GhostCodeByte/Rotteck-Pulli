import { useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { COLOR_VARIANTS, PRICE_IN_EURO } from "../data/productData.js";

function normaliseCountsRecord(record = {}) {
  return Object.entries(record)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

export default function AdminPage() {
  const [passwordInput, setPasswordInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markOrderState, setMarkOrderState] = useState({
    orderCode: "",
    status: "idle",
    error: "",
    success: "",
  });
  const [productionPriceInput, setProductionPriceInput] = useState("0");

  const { token: adminToken, login, logout } = useAdminAuth();
  const isAuthenticated = Boolean(adminToken);

  const colorLookup = useMemo(() => {
    const map = new Map();
    COLOR_VARIANTS.forEach(({ key, label }) => {
      map.set(key.toLowerCase(), label);
    });
    return map;
  }, []);

  const productionPrice = useMemo(() => {
    const normalised = Number.parseFloat(
      (productionPriceInput ?? "").toString().replace(",", ".")
    );
    if (!Number.isFinite(normalised) || normalised < 0) {
      return 0;
    }
    return normalised;
  }, [productionPriceInput]);

  const statusOverview = useMemo(() => {
    const counts = summary?.statusCounts ?? {};
    const totalOrders = summary?.totalOrders ?? 0;
    const paidOrders = counts.paid ?? 0;
    const unpaidOrders = Object.entries(counts).reduce(
      (acc, [status, count]) => {
        if (status === "paid") return acc;
        return acc + count;
      },
      0
    );
    return { totalOrders, paidOrders, unpaidOrders };
  }, [summary]);

  const colorCounts = useMemo(
    () =>
      normaliseCountsRecord(summary?.itemsByColor).map((entry) => ({
        ...entry,
        label: colorLookup.get(entry.key) ?? entry.key,
      })),
    [summary, colorLookup]
  );

  const sizeCounts = useMemo(
    () =>
      normaliseCountsRecord(summary?.itemsBySize).map((entry) => ({
        ...entry,
        label: entry.key.toUpperCase(),
      })),
    [summary]
  );

  const variantCounts = useMemo(() => {
    if (!summary?.itemsByVariant) return [];
    return Object.entries(summary.itemsByVariant)
      .map(([comboKey, value]) => {
        const [colorKey = "", sizeKey = ""] = comboKey.split("__");
        const colorLabel = colorLookup.get(colorKey) ?? colorKey;
        return {
          key: comboKey,
          label: `${colorLabel} ${sizeKey.toUpperCase()}`,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [summary, colorLookup]);

  const ordersPerDay = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      if (!order?.created_at) return;
      const date = new Date(order.created_at);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      const entry = map.get(key) ?? { date: key, total: 0, paid: 0, unpaid: 0 };
      entry.total += 1;
      if (order.status === "paid") {
        entry.paid += 1;
      } else {
        entry.unpaid += 1;
      }
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [orders]);

  const financials = useMemo(() => {
    const totals = {
      totalOrders: orders.length,
      paidOrders: 0,
      unpaidOrders: 0,
      paidItems: 0,
      unpaidItems: 0,
      paidRevenue: 0,
      unpaidRevenue: 0,
      paidProfit: 0,
      unpaidProfit: 0,
    };

    const marginPerItem = PRICE_IN_EURO - productionPrice;

    orders.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const quantity = items.reduce((sum, item) => {
        const amount = Number.isFinite(item?.quantity)
          ? Math.max(0, Number.parseInt(item.quantity, 10))
          : 0;
        return sum + amount;
      }, 0);

      const revenue = quantity * PRICE_IN_EURO;
      const profit = quantity * marginPerItem;

      if (order.status === "paid") {
        totals.paidOrders += 1;
        totals.paidItems += quantity;
        totals.paidRevenue += revenue;
        totals.paidProfit += profit;
      } else {
        totals.unpaidOrders += 1;
        totals.unpaidItems += quantity;
        totals.unpaidRevenue += revenue;
        totals.unpaidProfit += profit;
      }
    });

    totals.totalItems = totals.paidItems + totals.unpaidItems;
    totals.totalRevenue = totals.paidRevenue + totals.unpaidRevenue;
    totals.totalProfit = totals.paidProfit + totals.unpaidProfit;
    totals.marginPerItem = marginPerItem;

    return totals;
  }, [orders, productionPrice]);

  const resetMarkOrderState = () =>
    setMarkOrderState({
      orderCode: "",
      status: "idle",
      error: "",
      success: "",
    });

  useEffect(() => {
    if (!adminToken) {
      setSummary(null);
      setOrders([]);
      setVerificationError("");
      resetMarkOrderState();
    }
  }, [adminToken]);

  const fetchSummary = async (token) => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin-summary", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Das Passwort ist falsch.");
        }
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error || "Die Auswertung konnte nicht geladen werden."
        );
      }

      const payload = await response.json();
      setSummary(payload.summary);
      setOrders(payload.orders ?? []);
      return true;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!passwordInput.trim()) {
      setVerificationError("Bitte gib ein Passwort ein.");
      return;
    }
    setIsVerifying(true);
    setVerificationError("");

    const trimmed = passwordInput.trim();
    try {
      const success = await fetchSummary(trimmed);
      if (success) {
        login(trimmed);
        setPasswordInput("");
      }
    } catch (error) {
      setVerificationError(error.message || "Login fehlgeschlagen.");
    } finally {
      setIsVerifying(false);
    }
  };

  const refreshSummary = async () => {
    if (!adminToken) return;
    resetMarkOrderState();
    try {
      await fetchSummary(adminToken);
    } catch (error) {
      setVerificationError(error.message || "Aktualisierung fehlgeschlagen.");
      logout();
    }
  };

  const handleMarkOrderPaid = async (event) => {
    event.preventDefault();
    if (!adminToken) return;

    const trimmedCode = markOrderState.orderCode.trim();
    if (!trimmedCode) {
      setMarkOrderState((prev) => ({
        ...prev,
        status: "error",
        error: "Bitte gib einen Bestellcode ein.",
        success: "",
      }));
      return;
    }

    setMarkOrderState((prev) => ({
      ...prev,
      status: "submitting",
      error: "",
      success: "",
    }));

    try {
      const response = await fetch("/api/mark-order-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ orderCode: trimmedCode }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Aktualisierung fehlgeschlagen.");
      }

      const payload = await response.json();
      setMarkOrderState({
        orderCode: "",
        status: "success",
        error: "",
        success: `Bestellung ${
          payload.order?.order_hash ?? trimmedCode
        } als bezahlt markiert.`,
      });
      await fetchSummary(adminToken);
    } catch (error) {
      setMarkOrderState((prev) => ({
        ...prev,
        status: "error",
        error: error.message || "Aktualisierung fehlgeschlagen.",
      }));
    }
  };

  return (
    <section className="flex w-full max-w-5xl flex-col gap-6 text-white">
      <div>
        <h1 className="text-3xl font-semibold text-white">Admin-Bereich</h1>
      </div>

      {!isAuthenticated ? (
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40"
        >
          <label className="flex flex-col gap-2 text-sm text-white/80">
            Admin-Passwort
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
            />
          </label>
          {verificationError && (
            <p className="text-sm font-semibold text-red-300">
              {verificationError}
            </p>
          )}
          <button
            type="submit"
            disabled={isVerifying}
            className="inline-flex items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-5 py-3 text-base font-semibold text-white shadow-lg shadow-black/45 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isVerifying ? "Prüfe…" : "Anmelden"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Überblick</h2>
                <p className="text-sm text-white/60">
                  Zusammenfassung der gespeicherten Bestellungen.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <label className="flex flex-col gap-2 text-sm text-white/80">
                  Produktionspreis pro Pulli
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productionPriceInput}
                    onChange={(event) =>
                      setProductionPriceInput(event.target.value)
                    }
                    className="w-48 rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
                  />
                </label>
                <button
                  type="button"
                  onClick={refreshSummary}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-gray-900/70 px-4 py-2 text-sm font-semibold text-white/90 shadow-inner shadow-black/30 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshing ? "Aktualisiere…" : "Aktualisieren"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Bestellungen gesamt"
                value={statusOverview.totalOrders}
              />
              <SummaryCard
                title="Unbezahlt"
                value={statusOverview.unpaidOrders}
              />
              <SummaryCard title="Bezahlt" value={statusOverview.paidOrders} />
            </div>
          </div>

          <FinancialSummary financials={financials} />

          <div className="grid gap-6 md:grid-cols-2">
            <CountsPanel title="Nach Farbe" entries={colorCounts} />
            <CountsPanel title="Nach Größe" entries={sizeCounts} />
          </div>

          <CountsPanel title="Farbe × Größe" entries={variantCounts} />

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-white">
                Bestellungen pro Tag
              </h2>
              <span className="text-xs uppercase tracking-wide text-white/50">
                Zeitraum basierend auf gespeicherten Bestellungen
              </span>
            </div>
            {ordersPerDay.length > 0 ? (
              <OrdersPerDayChart data={ordersPerDay} />
            ) : (
              <p className="mt-4 text-sm text-white/60">
                Noch keine Bestellungen vorhanden.
              </p>
            )}
          </div>

          <form
            onSubmit={handleMarkOrderPaid}
            className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40"
          >
            <div>
              <h2 className="text-xl font-semibold text-white">
                Bestellung als bezahlt markieren
              </h2>
              <p className="text-sm text-white/60">
                Trage den Bestellcode aus der Überweisung ein.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm text-white/80">
              Bestellcode
              <input
                type="text"
                value={markOrderState.orderCode}
                onChange={(event) =>
                  setMarkOrderState((prev) => ({
                    ...prev,
                    orderCode: event.target.value.toUpperCase(),
                    status: "idle",
                    error: "",
                    success: "",
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
                placeholder="Z. B. 50DDE13CCD31"
              />
            </label>

            {markOrderState.error && (
              <p className="text-sm font-semibold text-red-300">
                {markOrderState.error}
              </p>
            )}
            {markOrderState.success && (
              <p className="text-sm font-semibold text-emerald-300">
                {markOrderState.success}
              </p>
            )}

            <button
              type="submit"
              disabled={markOrderState.status === "submitting"}
              className="inline-flex items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-5 py-3 text-base font-semibold text-white shadow-lg shadow-black/45 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {markOrderState.status === "submitting"
                ? "Speichere…"
                : "Als bezahlt markieren"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/30">
      <p className="text-xs uppercase tracking-widest text-white/60">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value ?? 0}</p>
    </div>
  );
}

function CountsPanel({ title, entries }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {entries && entries.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2 text-sm text-white/80">
          {entries.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
            >
              <span className="font-semibold capitalize">
                {entry.label ?? entry.key}
              </span>
              <span className="text-base font-bold text-white">
                {entry.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">Keine Daten vorhanden.</p>
      )}
    </div>
  );
}

function FinancialSummary({ financials }) {
  const formatCurrency = (value) =>
    Number.isFinite(value)
      ? value.toLocaleString("de-DE", {
          style: "currency",
          currency: "EUR",
        })
      : "–";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-white">Finanzen</h2>
        <span className="text-xs uppercase tracking-wide text-white/50">
          Verkaufspreis: {formatCurrency(PRICE_IN_EURO)} pro Pulli
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinancialCard
          label="Marge pro Pulli"
          primary={formatCurrency(financials.marginPerItem)}
          description="Verkaufspreis minus Produktionspreis"
        />
        <FinancialCard
          label="Gewinn (bezahlt)"
          primary={formatCurrency(financials.paidProfit)}
          secondary={`${financials.paidItems ?? 0} Stück bezahlt`}
        />
        <FinancialCard
          label="Gewinn (ausstehend)"
          primary={formatCurrency(financials.unpaidProfit)}
          secondary={`${financials.unpaidItems ?? 0} Stück offen`}
        />
        <FinancialCard
          label="Gesamtgewinn"
          primary={formatCurrency(financials.totalProfit)}
          secondary={`${financials.totalItems ?? 0} Stück insgesamt`}
        />
      </div>
    </div>
  );
}

function FinancialCard({ label, primary, secondary, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/30">
      <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{primary}</p>
      {secondary ? (
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/50">
          {secondary}
        </p>
      ) : null}
      {description ? (
        <p className="mt-3 text-xs text-white/40">{description}</p>
      ) : null}
    </div>
  );
}

function OrdersPerDayChart({ data }) {
  const maxTotal = data.reduce((max, entry) => Math.max(max, entry.total), 0);
  if (maxTotal === 0) {
    return (
      <p className="mt-4 text-sm text-white/60">
        Noch keine Bestellungen vorhanden.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex h-56 w-full items-end gap-3 overflow-x-auto pb-2">
        {data.map(({ date, total, paid, unpaid }) => {
          const paidRatio = total > 0 ? paid / total : 0;
          const unpaidRatio = total > 0 ? unpaid / total : 0;
          const totalHeight = Math.max(0, (total / maxTotal) * 100);
          const adjustedHeight =
            total > 0 ? Math.max(8, Math.min(100, totalHeight)) : 0;
          return (
            <div
              key={date}
              className="flex w-16 min-w-[4rem] flex-col items-center gap-2"
            >
              <div className="flex h-full w-full items-end justify-center rounded-t-2xl bg-white/10 p-1">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-xl"
                  style={{ height: `${adjustedHeight}%` }}
                >
                  <div
                    className="h-full w-full bg-emerald-400/80"
                    style={{ height: `${Math.max(0, paidRatio * 100)}%` }}
                    aria-hidden="true"
                  />
                  <div
                    className="h-full w-full bg-[rgb(204,31,47)]/80"
                    style={{ height: `${Math.max(0, unpaidRatio * 100)}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="text-center text-xs text-white/70">
                <div className="font-semibold">{total}</div>
                <div>
                  {new Date(date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full bg-emerald-400/80"
            aria-hidden="true"
          />
          Bezahlt
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full bg-[rgb(204,31,47)]/80"
            aria-hidden="true"
          />
          Offen
        </span>
      </div>
    </div>
  );
}
