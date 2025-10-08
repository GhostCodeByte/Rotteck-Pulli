export default function AddToCartBar({ onAdd, className = "" }) {
  return (
    <div
      className={"mx-auto flex w-full max-w-5xl justify-center " + className}
    >
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-w-[12rem] items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[rgba(0,0,0,0.45)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        In den Warenkorb
      </button>
    </div>
  );
}
