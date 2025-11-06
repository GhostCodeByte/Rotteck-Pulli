import { useEffect, useMemo, useRef, useState, useId } from "react";
import { motion } from "framer-motion";

import {
  COLOR_VARIANTS,
  PRICE_IN_EURO,
  VARIANT_IMAGES,
  SIZE_OPTIONS,
} from "../data/productData.js";
import { cn } from "../utils/cn.js";

const sideScale = 0.82;

export default function ProductShowcase({
  activeColor,
  onColorChange,
  selectedSize,
  onSizeChange,
}) {
  const colorSelectId = useId();
  const images = useMemo(
    () => [...(VARIANT_IMAGES[activeColor] ?? [])],
    [activeColor]
  );
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [orientations, setOrientations] = useState({});
  const swipeStateRef = useRef({ pointerId: null, startX: 0, active: false });

  const total = images.length;
  const goTo = (target) => {
    if (!total) return;
    const normalized = ((target % total) + total) % total;
    setCurrent(normalized);
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

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
    const missing = images.filter((src) => !orientations[src]);
    if (missing.length === 0) return;

    let cancelled = false;
    const loaders = missing.map((src) => {
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
  }, [images, orientations]);

  const margin = containerWidth ? Math.max(16, containerWidth * 0.03) : 20;
  const preferredWidth = containerWidth ? containerWidth * 0.64 : 340;
  const maxWidth = containerWidth
    ? Math.max(160, containerWidth - margin * 2)
    : 600;
  const baseWidth = containerWidth
    ? Math.min(580, Math.max(140, Math.min(preferredWidth, maxWidth)))
    : 360;
  const imageHeight = Math.min(440, Math.max(210, baseWidth * 0.7));
  const sideWidth = baseWidth * sideScale;
  const centerDistance = baseWidth / 2 + sideWidth / 2;
  const innerOverlap = Math.min(baseWidth * 0.32, sideWidth * 0.46);
  const outerExposure = containerWidth
    ? Math.min(sideWidth * 0.22, Math.max(28, containerWidth * 0.09))
    : sideWidth * 0.24;
  const spacingBase = centerDistance - innerOverlap + outerExposure;

  const swipeThreshold = Math.max(
    48,
    containerWidth ? containerWidth * 0.08 : 60
  );

  const resetSwipeState = () => {
    swipeStateRef.current = { pointerId: null, startX: 0, active: false };
  };

  const handlePointerEnd = (event) => {
    const state = swipeStateRef.current;
    if (!state.active || state.pointerId !== event.pointerId) {
      return;
    }

    const endX =
      typeof event.clientX === "number" && !Number.isNaN(event.clientX)
        ? event.clientX
        : state.lastX ?? state.startX;
    const deltaX = endX - state.startX;
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX < 0) next();
      else prev();
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    resetSwipeState();
  };

  const handlePointerDown = (event) => {
    if (swipeStateRef.current.active) {
      return;
    }

    swipeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      active: true,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const state = swipeStateRef.current;
    if (!state.active || state.pointerId !== event.pointerId) {
      return;
    }
    const currentX =
      typeof event.clientX === "number" && !Number.isNaN(event.clientX)
        ? event.clientX
        : state.lastX ?? state.startX;
    swipeStateRef.current = { ...state, lastX: currentX };
  };

  const handlePointerCancel = (event) => {
    const state = swipeStateRef.current;
    if (state.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      resetSwipeState();
    }
  };

  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-between gap-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[2.3rem] border border-white/5 bg-gradient-to-br from-gray-800/70 via-gray-900/80 to-gray-950 px-4 py-10 shadow-2xl shadow-black/40 backdrop-blur"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
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
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 34,
                    mass: 0.78,
                  }}
                  whileTap={
                    isActive ? { scale: 0.98 } : { scale: scale * 0.98 }
                  }
                  onClick={() => {
                    if (!isActive) goTo(index);
                  }}
                  onKeyDown={(event) => {
                    if (isActive) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      goTo(index);
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
      <div className="flex w-full flex-col gap-3 px-1 sm:flex-col sm:items-center sm:justify-center">
        <div className="sm:hidden">
          <label
            htmlFor={colorSelectId}
            className="mb-2 block text-xs uppercase tracking-widest text-white/60"
          >
            Farbe wählen
          </label>
          <div className="relative">
            <select
              id={colorSelectId}
              value={activeColor}
              onChange={(event) => onColorChange?.(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-black/30 transition focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
            >
              {COLOR_VARIANTS.map((variant) => (
                <option
                  key={variant.key}
                  value={variant.key}
                  className="bg-gray-900 text-white"
                >
                  {variant.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[rgb(204,31,47)]">
              ▾
            </span>
          </div>
        </div>

        <div className="hidden items-center justify-center gap-2 overflow-hidden sm:flex sm:gap-3">
          {COLOR_VARIANTS.map((variant) => {
            const isSelected = variant.key === activeColor;
            const previewSrc = VARIANT_IMAGES[variant.key]?.[0];
            return (
              <button
                key={variant.key}
                type="button"
                onClick={() => {
                  if (variant.key !== activeColor) {
                    onColorChange?.(variant.key);
                  }
                }}
                className={cn(
                  "group flex min-w-0 flex-1 basis-[6.5rem] flex-nowrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 sm:flex-none sm:basis-auto sm:min-w-[8.5rem] sm:px-3 sm:py-2.5",
                  isSelected
                    ? "border-[rgb(204,31,47)] bg-white/15 shadow-[0_0_0_1px_rgba(204,31,47,0.35)]"
                    : "hover:border-[rgb(204,31,47)]/70"
                )}
              >
                <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-800/80 sm:h-14 sm:w-14">
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
                <span
                  className="truncate text-sm font-semibold text-white"
                  title={variant.label}
                >
                  {variant.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-black/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col">
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
          <div className="relative w-full sm:w-auto sm:shrink sm:[width:clamp(7.5rem,40vw,12.5rem)] sm:min-w-[7.5rem]">
            <select
              id="size-select"
              value={selectedSize}
              onChange={(event) => onSizeChange?.(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-black/30 transition focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40"
            >
              {SIZE_OPTIONS.map((size) => (
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
    </section>
  );
}
