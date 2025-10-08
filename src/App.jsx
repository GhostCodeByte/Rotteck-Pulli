import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const ACCENT_COLOR = "rgb(204,31,47)";

const COLOR_VARIANTS = [
  { key: "rot", label: "Rot" },
  { key: "blau", label: "Blau" },
  { key: "schwarz", label: "Schwarz" },
];

const productImageModules = import.meta.glob(
  "./assets/products/*/*.{png,jpg,jpeg,webp,avif,svg}",
  { eager: true }
);

const VARIANT_IMAGES = (() => {
  const result = COLOR_VARIANTS.reduce((acc, { key }) => {
    acc[key] = [];
    return acc;
  }, {});

  Object.entries(productImageModules).forEach(([path, module]) => {
    const match = path.match(/assets\/products\/([^/]+)\//);
    if (!match) return;
    const variantKey = match[1];
    if (!result[variantKey]) {
      result[variantKey] = [];
    }
    result[variantKey].push({ path, src: module.default });
  });

  Object.entries(result).forEach(([key, list]) => {
    list.sort((a, b) =>
      a.path.localeCompare(b.path, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    result[key] = list.map((item) => item.src);
  });

  return result;
})();

const PRICE_IN_EURO = 109.0;

/* Top bar + responsive carousel with swipe, buttons, and animations
   Theme: gray background, white text, accent rgb(204, 31, 47)
*/
export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-900 text-white">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="relative mx-auto flex h-16 w-full max-w-screen-lg items-center px-4">
          {/* Left: Hamburger menu */}
          <div className="flex flex-1 items-center">
            <button
              type="button"
              aria-label="Menü öffnen"
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-800 active:bg-gray-700"
            >
              <HamburgerIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Center: Brand/Icon (fixed center regardless of sides) */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
            <div className="pointer-events-auto inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-800 active:bg-gray-700">
              <BrandIcon className="h-7 w-7" />
            </div>
          </div>

          {/* Right: Shopping cart */}
          <div className="flex flex-1 items-center justify-end">
            <button
              type="button"
              aria-label="Warenkorb"
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-800 active:bg-gray-700"
            >
              <CartIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Carousel */}
      <main className="flex w-full flex-1 items-center justify-center px-4 py-6 sm:py-8">
        <Carousel />
      </main>
    </div>
  );
}

const DEFAULT_COLOR = COLOR_VARIANTS[0]?.key ?? "";

function Carousel() {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR);
  const images = useMemo(
    () => [...(VARIANT_IMAGES[activeColor] ?? [])],
    [activeColor]
  );
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [orientations, setOrientations] = useState({});

  const total = images.length;
  const goTo = (target) => {
    if (!total) return;
    const normalized = ((target % total) + total) % total;
    setCurrent(normalized);
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const handleColorChange = (variantKey) => {
    if (variantKey === activeColor) return;
    setActiveColor(variantKey);
  };

  useEffect(() => {
    setCurrent(0);
  }, [activeColor]);

  useEffect(() => {
    const update = () => {
      const width = containerRef.current?.clientWidth ?? 0;
      setContainerWidth(width);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loaders = images.map((src) => {
      const img = new Image();
      const assign = () => {
        if (cancelled) return;
        setOrientations((prev) => {
          if (prev[src]) return prev;
          const { naturalWidth = 0, naturalHeight = 0 } = img;
          const ratio = naturalHeight ? naturalWidth / naturalHeight : 1;
          const orientation = ratio >= 1 ? "landscape" : "portrait";
          return { ...prev, [src]: { orientation, ratio } };
        });
      };
      img.src = src;
      if (img.complete) assign();
      else img.addEventListener("load", assign, { once: true });
      return () => img.removeEventListener("load", assign);
    });
    return () => {
      cancelled = true;
      loaders.forEach((cleanup) => cleanup?.());
    };
  }, [images]);

  const margin = containerWidth ? Math.max(16, containerWidth * 0.03) : 20;
  const preferredWidth = containerWidth ? containerWidth * 0.64 : 340;
  const maxWidth = containerWidth
    ? Math.max(160, containerWidth - margin * 2)
    : 600;
  const baseWidth = containerWidth
    ? Math.min(580, Math.max(140, Math.min(preferredWidth, maxWidth)))
    : 360;
  const sideScale = 0.82;
  const imageHeight = Math.min(440, Math.max(210, baseWidth * 0.7));
  const sideWidth = baseWidth * sideScale;
  const centerDistance = baseWidth / 2 + sideWidth / 2;
  const innerOverlap = Math.min(baseWidth * 0.32, sideWidth * 0.46);
  const outerExposure = containerWidth
    ? Math.min(sideWidth * 0.22, Math.max(28, containerWidth * 0.09))
    : sideWidth * 0.24;
  const spacingBase = centerDistance - innerOverlap + outerExposure;
  const dotItems = useMemo(() => {
    if (!total) return [];
    const needsExtra = total % 2 === 0;
    const displayCount = needsExtra ? total + 1 : total;
    const half = Math.floor(displayCount / 2);
    return Array.from({ length: displayCount }, (_, slotIndex) => {
      const relative = slotIndex - half;
      const targetIndex = (((current + relative) % total) + total) % total;
      return {
        key: `dot-${slotIndex}-${targetIndex}`,
        targetIndex,
        relative,
      };
    });
  }, [current, total]);

  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-between gap-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[2.3rem] border border-white/5 bg-gradient-to-br from-gray-800/70 via-gray-900/80 to-gray-950 px-4 py-10 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <div
          className="relative mx-auto w-full max-w-4xl"
          style={{ height: imageHeight }}
        >
          {images.length === 0 ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/60">
              Bitte füge Produktbilder in den Ordner der ausgewählten Farbe ein.
            </div>
          ) : (
            images.map((src, index) => {
              let offset = index - current;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;

              const distance = Math.abs(offset);
              if (distance > 1) return null;

              const isActive = offset === 0;
              const scale = isActive ? 1 : sideScale;
              const opacity = isActive ? 1 : 0.78;
              const meta = orientations[src];
              const fallbackRatio = 0.68;
              const ratio = meta?.ratio ?? fallbackRatio;
              const isPortrait = meta ? meta.orientation === "portrait" : true;
              const desiredWidth = imageHeight * ratio;
              const minPortraitWidth = baseWidth * 0.42;
              const maxPortraitWidth = baseWidth * 0.95;
              const figureWidth = isPortrait
                ? Math.min(
                    maxPortraitWidth,
                    Math.max(minPortraitWidth, desiredWidth)
                  )
                : baseWidth;
              const widthFactor = figureWidth / baseWidth;
              const spacingFactor = isPortrait ? 0.65 + widthFactor * 0.35 : 1;
              const translateX = offset * spacingBase * spacingFactor;
              const rotate = offset * -1.8;

              return (
                <motion.figure
                  key={`${src}-${index}`}
                  className={cn(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-pan-y",
                    isActive ? "cursor-grab" : "cursor-pointer"
                  )}
                  initial={false}
                  animate={{
                    x: translateX,
                    scale,
                    opacity,
                    rotate,
                    zIndex: isActive ? 40 : 30,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  dragMomentum={false}
                  whileTap={{ cursor: "grabbing" }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) next();
                    if (info.offset.x > 80) prev();
                  }}
                  onClick={() => {
                    if (offset === -1) prev();
                    if (offset === 1) next();
                  }}
                  onKeyDown={(event) => {
                    if (isActive) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (offset === -1) prev();
                      if (offset === 1) next();
                    }
                  }}
                  style={{ width: figureWidth, height: imageHeight }}
                  role={!isActive ? "button" : undefined}
                  tabIndex={!isActive ? 0 : -1}
                  aria-label={
                    !isActive
                      ? `Zum ${
                          offset === -1 ? "vorherigen" : "nächsten"
                        } Bild wechseln`
                      : undefined
                  }
                >
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-gray-900 shadow-xl shadow-black/40 ring-1 ring-white/10">
                    <img
                      src={src}
                      alt={`Produktansicht ${index + 1}`}
                      className={cn(
                        "transition-transform duration-500 ease-out",
                        isPortrait
                          ? "h-full w-auto max-w-full object-contain"
                          : "h-full w-full object-cover",
                        isActive ? "hover:scale-[1.04]" : ""
                      )}
                      draggable={false}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 opacity-60" />
                  </div>
                </motion.figure>
              );
            })
          )}
        </div>

        {total > 0 && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              className="pointer-events-auto h-full w-24 cursor-w-resize rounded-l-[2.5rem] bg-gradient-to-r from-black/30 via-black/0 to-transparent opacity-40 transition hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
              aria-label="Vorheriges Bild"
            >
              <span className="sr-only">Vorheriges Bild</span>
            </button>
            <button
              type="button"
              onClick={next}
              className="pointer-events-auto h-full w-24 cursor-e-resize rounded-r-[2.5rem] bg-gradient-to-l from-black/30 via-black/0 to-transparent opacity-40 transition hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
              aria-label="Nächstes Bild"
            >
              <span className="sr-only">Nächstes Bild</span>
            </button>
          </div>
        )}
      </div>

      {/* Indicators */}
      <div className="flex items-center justify-center gap-2.5">
        {dotItems.map((item) => {
          const active = item.relative === 0;
          const distance = Math.abs(item.relative);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => goTo(item.targetIndex)}
              className={cn(
                "rounded-full transition-all",
                active
                  ? "h-3 w-12 bg-[rgb(204,31,47)]"
                  : "h-2.5 bg-white/30 hover:bg-white/60",
                !active && distance === 1 && "w-6",
                !active && distance > 1 && "w-4 opacity-70"
              )}
              aria-label={`Bild ${item.targetIndex + 1} anzeigen`}
            />
          );
        })}
      </div>

      {/* Farbvarianten */}
      <div className="flex flex-wrap items-center justify-center gap-3.5">
        {COLOR_VARIANTS.map((variant) => {
          const isSelected = variant.key === activeColor;
          const previewSrc = VARIANT_IMAGES[variant.key]?.[0];
          return (
            <button
              key={variant.key}
              type="button"
              onClick={() => handleColorChange(variant.key)}
              className={cn(
                "group flex min-w-[9.5rem] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40",
                isSelected && "border-[rgb(204,31,47)] bg-white/15",
                !isSelected && "hover:border-[rgb(204,31,47)]/70",
              )}
            >
              <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gray-800/80">
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt={`${variant.label} Vorschau`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="h-full w-full bg-white/10" />
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {variant.label}
                </span>
                <span className="text-xs text-white/60">Farbvariante</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Preis & Größenauswahl */}
      <div className="flex w-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-black/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-white/60">
            Preis
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">
              {PRICE_IN_EURO.toLocaleString("de-DE", {
                style: "currency",
                currency: "EUR",
              })}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label
            htmlFor="size-select"
            className="text-xs uppercase tracking-widest text-white/60"
          >
            Größe wählen
          </label>
          <div className="relative w-full min-w-[12rem] sm:w-auto">
            <select
              id="size-select"
              className="w-full appearance-none rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-black/30 transition focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
              defaultValue="M"
            >
              {"XS S M L XL XXL".split(" ").map((size) => (
                <option
                  key={size}
                  value={size}
                  className="bg-gray-900 text-white"
                >
                  {size}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[rgb(204,31,47)]">
              ▾
            </span>
          </div>
        </div>
      </div>

      {/* Produktinformationen folgen später hier */}
    </section>
  );
}

/* Utility */
function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* Icons (placeholders) */
function IconBase({ className = "h-6 w-6", children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

function HamburgerIcon(props) {
  return (
    <IconBase {...props}>
      <path strokeWidth="2" strokeLinecap="round" d="M4 6h16" />
      <path strokeWidth="2" strokeLinecap="round" d="M4 12h16" />
      <path strokeWidth="2" strokeLinecap="round" d="M4 18h16" />
    </IconBase>
  );
}

function BrandIcon(props) {
  return (
    <IconBase {...props}>
      {/* Diamond shape */}
      <path
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 3 20 12l-8 9L4 12l8-9Z"
      />
    </IconBase>
  );
}

function CartIcon(props) {
  return (
    <IconBase {...props}>
      {/* Simple shopping bag icon */}
      <path d="M6 8h12l-1 11H7L6 8Z" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 8a3 3 0 0 1 6 0" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}
