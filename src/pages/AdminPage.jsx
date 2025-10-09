import { useMemo, useState } from "react";

const STATUS_LABELS = {
  pending: "Offen",
  paid: "Bezahlt",
  unbekannt: "Unbekannt",
};

function formatStatusLabel(status) {
  const key = typeof status === "string" ? status.toLowerCase() : "unbekannt";
  return STATUS_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function normaliseCountsRecord(record = {}) {
  return Object.entries(record)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

export default function AdminPage() {
  const [passwordInput, setPasswordInput] = useState("");
  const [adminToken, setAdminToken] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markOrderState, setMarkOrderState] = useState({
    orderCode: "",
    paymentReference: "",
    status: "idle",
    error: "",
    success: "",
  });

  const isAuthenticated = Boolean(adminToken);

  const statusCards = useMemo(() => {
    if (!summary) return [];
    const statusEntries = Object.entries(summary.statusCounts || {});
    return statusEntries.map(([status, count]) => ({
      status,
      count,
      label: formatStatusLabel(status),
    }));
  }, [summary]);

  const colorCounts = useMemo(
    () => normaliseCountsRecord(summary?.itemsByColor),
    [summary]
  );
  const sizeCounts = useMemo(
    () => normaliseCountsRecord(summary?.itemsBySize),
    [summary]
  );
  const variantCounts = useMemo(() => {
    if (!summary?.itemsByVariant) return [];
    return Object.entries(summary.itemsByVariant)
      .map(([comboKey, value]) => {
        const [color, size] = comboKey.split("__");
        return { key: comboKey, color, size, value };
      })
      .sort((a, b) => b.value - a.value);
  }, [summary]);
  const recentOrders = useMemo(() => orders.slice(0, 20), [orders]);

  const resetMarkOrderState = () =>
    setMarkOrderState((prev) => ({
      ...prev,
      status: "idle",
      error: "",
      success: "",
    }));

  const fetchSummary = async (password) => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin-summary", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${password}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Das Passwort ist falsch.");
        }
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error ||
            "Die Auswertung konnte nicht geladen werden."
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

    try {
      const success = await fetchSummary(passwordInput.trim());
      if (success) {
        setAdminToken(passwordInput.trim());
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
      setAdminToken(null);
      setSummary(null);
      setOrders([]);
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
        body: JSON.stringify({
          orderCode: trimmedCode,
          paymentReference: markOrderState.paymentReference.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Aktualisierung fehlgeschlagen.");
      }

      const payload = await response.json();
      setMarkOrderState({
        orderCode: "",
        paymentReference: "",
        status: "success",
        error: "",
        success: `Bestellung ${payload.order?.order_hash ?? trimmedCode} als bezahlt markiert.`,
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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
        <h1 className="text-2xl font-semibold text-white">Admin-Bereich</h1>
        <p className="mt-1 text-sm text-white/60">
          Zugriff nur mit gültigem Admin-Passwort. Die eingegebenen Daten werden
          niemals im Browser gespeichert.
        </p>
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
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Überblick
                </h2>
                <p className="text-sm text-white/60">
                  Zusammenfassung der gespeicherten Bestellungen.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshSummary}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-gray-900/70 px-4 py-2 text-sm font-semibold text-white/90 shadow-inner shadow-black/30 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshing ? "Aktualisiere…" : "Aktualisieren"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminToken(null);
                    setSummary(null);
                    setOrders([]);
                    setVerificationError("");
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-gray-900/70 px-4 py-2 text-sm font-semibold text-white/70 shadow-inner shadow-black/30 transition hover:border-white/30 hover:text-white"
                >
                  Abmelden
                </button>
              </div>
            </div>

            {summary ? (
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Bestellungen gesamt"
                  value={summary.totalOrders}
                />
                {statusCards.map((card) => (
                  <SummaryCard
                    key={card.status}
                    title={`Status: ${card.label}`}
                    value={card.count}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">
                Keine Daten gefunden. Bitte aktualisieren.
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <CountsPanel title="Nach Farbe" entries={colorCounts} />
            <CountsPanel title="Nach Größe" entries={sizeCounts} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
            <h2 className="text-xl font-semibold text-white">
              Kombination Farbe × Größe
            </h2>
            {variantCounts.length > 0 ? (
              <table className="mt-4 w-full table-auto border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-white/50">
                  <tr>
                    <th className="px-3 py-2">Farbe</th>
                    <th className="px-3 py-2">Größe</th>
                    <th className="px-3 py-2 text-right">Anzahl</th>
                  </tr>
                </thead>
                <tbody>
                  {variantCounts.map((entry) => (
                    <tr
                      key={entry.key}
                      className="rounded-xl bg-white/5 text-white/90"
                    >
                      <td className="px-3 py-2 font-semibold capitalize">
                        {entry.color}
                      </td>
                      <td className="px-3 py-2 font-medium uppercase">
                        {entry.size}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {entry.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-white/60">
                Noch keine Kombinationen vorhanden.
              </p>
            )}
          </div>

          {recentOrders.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
              <h2 className="text-xl font-semibold text-white">
                Letzte Bestellungen
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full table-auto border-separate border-spacing-y-2 text-left text-sm text-white/80">
                  <thead className="text-xs uppercase tracking-widest text-white/50">
                    <tr>
                      <th className="px-3 py-2">Bestellcode</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">E-Mail</th>
                      <th className="px-3 py-2">Erstellt</th>
                      <th className="px-3 py-2">Zahlungsreferenz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr
                        key={order.order_hash}
                        className="rounded-2xl bg-white/5 text-white/90"
                      >
                        <td className="px-3 py-2 font-semibold uppercase tracking-wide">
                          {order.order_hash}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {formatStatusLabel(order.status)}
                        </td>
                        <td className="px-3 py-2 font-medium text-white/80">
                          {order.email}
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString("de-DE")
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {order.payment_reference || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <form
            onSubmit={handleMarkOrderPaid}
            className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40"
          >
            <div>
              <h2 className="text-xl font-semibold text-white">
                Bestellung als bezahlt markieren
              </h2>
              <p className="text-sm text-white/60">
                Trage den Bestellcode aus der Überweisung ein. Optional kannst du
                den tatsächlichen Zahlungsreferenz-Text speichern.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

              <label className="flex flex-col gap-2 text-sm text-white/80">
                Zahlungsreferenz (optional)
                <input
                  type="text"
                  value={markOrderState.paymentReference}
                  onChange={(event) =>
                    setMarkOrderState((prev) => ({
                      ...prev,
                      paymentReference: event.target.value,
                      status: "idle",
                      error: "",
                      success: "",
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
                  placeholder="Verwendungszweck der Überweisung"
                />
              </label>
            </div>

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
              <span className="font-semibold capitalize">{entry.key}</span>
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
