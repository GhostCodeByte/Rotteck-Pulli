import { Link, Navigate, useLocation } from "react-router-dom";

export default function OrderSuccessPage() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return <Navigate to="/" replace />;
  }

  const createdAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString("de-DE")
    : new Date().toLocaleString("de-DE");

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
        <code className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-600/20 px-6 py-3 text-xl font-semibold tracking-wide text-emerald-50">
          {order.orderCode}
        </code>
        <p className="text-xs text-emerald-100/80">
          Gespeichert für {" "}
          <span className="font-medium text-emerald-50">{order.email}</span> am {" "}
          {createdAt}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-inner shadow-black/40">
        <p className="text-sm">
          Du kannst diese Seite als Screenshot sichern oder den Bestellcode notieren.
        </p>
        <p className="text-sm">
          Sobald deine Überweisung bei uns eingeht, melden wir uns bei dir.
        </p>
      </div>

      <Link
        to="/"
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-black/45 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        Zur Startseite
      </Link>
    </section>
  );
}
