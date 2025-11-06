import { cn } from "../utils/cn.js";

export default function AddToCartBar({
  onAdd,
  onClick,
  className = "",
  children = "In den Warenkorb",
}) {
  const handleClick = onClick ?? onAdd;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex min-w-[12rem] items-center justify-center rounded-2xl bg-[rgb(204,31,47)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-black/45 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
        className,
      )}
      disabled={!handleClick}
    >
      {children}
    </button>
  );
}
