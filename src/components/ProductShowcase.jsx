import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  COLOR_VARIANTS,
  PRICE_IN_EURO,
  VARIANT_IMAGES,
  SIZE_OPTIONS,
} from "../data/productData.js";
import { cn } from "../utils/cn.js";
import AddToCartBar from "./AddToCartBar.jsx";

const MOTION_USED = !!motion;
const sideScale = 0.82;

export default function ProductShowcase({
  activeColor,
  onColorChange,
  selectedSize,
  onSizeChange,
  onAddToCart,
}) {
  const colorSelectId = useId();
  const images = useMemo(
    () => [...(VARIANT_IMAGES[activeColor] ?? [])],
    [activeColor],
  );
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const modalContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [orientations, setOrientations] = useState({});
  const swipeStateRef = useRef({
    id: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    active: false,
    isHorizontal: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const total = images.length;
  const goTo = useCallback(
    (target) => {
      if (!total) return;
      const normalized = ((target % total) + total) % total;
      setCurrent(normalized);
    },
    [total],
  );

  const next = useCallback(() => {
    goTo(current + 1);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo(current - 1);
  }, [current, goTo]);

  useEffect(() => {
    setCurrent(0);
    setIsModalOpen(false);
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

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    let originalOverflow;
    if (typeof document !== "undefined") {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (typeof document !== "undefined") {
        document.body.style.overflow = originalOverflow ?? "";
      }
    };
  }, [isModalOpen, next, prev]);

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
  const swipeThreshold = 32;
  const directionLockThreshold = 10;
  const supportsPointer =
    typeof window !== "undefined" && "PointerEvent" in window;

  const shouldHandleSwipeGesture = (target) =>
    !target?.closest?.("[data-swipe-ignore='true']");

  const resetSwipeState = () => {
    swipeStateRef.current = {
      id: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      active: false,
      isHorizontal: null,
    };
  };

  const startSwipe = (id, clientX, clientY) => {
    if (swipeStateRef.current.active) return;
    const safeX =
      typeof clientX === "number" && !Number.isNaN(clientX) ? clientX : 0;
    const safeY =
      typeof clientY === "number" && !Number.isNaN(clientY) ? clientY : 0;
    swipeStateRef.current = {
      id,
      startX: safeX,
      startY: safeY,
      lastX: safeX,
      lastY: safeY,
      active: true,
      isHorizontal: null,
    };
  };

  const updateSwipePosition = (id, clientX, clientY) => {
    const state = swipeStateRef.current;
    if (!state.active || state.id !== id) return;
    const safeX =
      typeof clientX === "number" && !Number.isNaN(clientX)
        ? clientX
        : state.lastX;
    const safeY =
      typeof clientY === "number" && !Number.isNaN(clientY)
        ? clientY
        : state.lastY;

    // Determine swipe direction on first significant movement
    if (state.isHorizontal === null) {
      const deltaX = Math.abs(safeX - state.startX);
      const deltaY = Math.abs(safeY - state.startY);
      if (deltaX > directionLockThreshold || deltaY > directionLockThreshold) {
        state.isHorizontal = deltaX > deltaY;
      }
    }

    swipeStateRef.current = { ...state, lastX: safeX, lastY: safeY };
  };

  const finishSwipe = (id, clientX, clientY) => {
    const state = swipeStateRef.current;
    if (!state.active || state.id !== id)
      return { handled: false, exceeded: false, delta: 0 };
    const finalX =
      typeof clientX === "number" && !Number.isNaN(clientX)
        ? clientX
        : (state.lastX ?? state.startX);
    const finalY =
      typeof clientY === "number" && !Number.isNaN(clientY)
        ? clientY
        : (state.lastY ?? state.startY);
    const deltaX = finalX - state.startX;
    const deltaY = finalY - state.startY;

    // Only handle horizontal swipes
    const isHorizontal =
      state.isHorizontal !== null
        ? state.isHorizontal
        : Math.abs(deltaX) > Math.abs(deltaY);
    const exceeded = isHorizontal && Math.abs(deltaX) > swipeThreshold;

    if (exceeded) {
      if (deltaX < 0) next();
      else prev();
    }
    resetSwipeState();
    return { handled: true, exceeded, delta: deltaX, isHorizontal };
  };

  const cancelSwipe = (id) => {
    if (swipeStateRef.current.id !== id) return;
    resetSwipeState();
  };

  const handleTapTarget = (target) => {
    const element = target?.closest?.("[data-image-index]");
    if (!element) return;
    const index = Number(element.getAttribute("data-image-index"));
    if (Number.isNaN(index)) return;
    if (index === current) {
      if (!isModalOpen) setIsModalOpen(true);
    } else {
      goTo(index);
    }
  };

  const handlePointerDown = (event) => {
    if (!shouldHandleSwipeGesture(event.target)) return;
    startSwipe(event.pointerId, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    updateSwipePosition(event.pointerId, event.clientX, event.clientY);
  };

  const handlePointerUp = (event) => {
    const result = finishSwipe(event.pointerId, event.clientX, event.clientY);

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    void result;

    // Tap handling is handled via figure onClick to avoid duplicate triggers
  };

  const handlePointerCancel = (event) => {
    cancelSwipe(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handlePointerLeave = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      return; // Don't cancel if we still have capture
    }
    cancelSwipe(event.pointerId);
  };

  const handleTouchStart = (event) => {
    if (supportsPointer) return;
    if (!shouldHandleSwipeGesture(event.target)) return;

    const touch = event.touches?.[0];

    if (!touch) return;

    startSwipe(touch.identifier, touch.clientX, touch.clientY);
  };

  const handleTouchMove = (event) => {
    if (supportsPointer) return;
    const state = swipeStateRef.current;

    if (!state.active) return;

    const touch = Array.from(event.touches || []).find(
      (entry) => entry.identifier === state.id,
    );

    if (!touch) return;

    updateSwipePosition(touch.identifier, touch.clientX, touch.clientY);

    // Prevent vertical scrolling if horizontal swipe is detected

    if (state.isHorizontal) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = (event) => {
    if (supportsPointer) return;
    const state = swipeStateRef.current;

    if (!state.active) return;

    const touch = Array.from(event.changedTouches || []).find(
      (entry) => entry.identifier === state.id,
    );

    if (!touch) return;

    const result = finishSwipe(touch.identifier, touch.clientX, touch.clientY);

    if (result?.handled && !result.exceeded) {
      handleTapTarget(event.target);
    }
  };

  const handleTouchCancel = (event) => {
    if (supportsPointer) return;
    const state = swipeStateRef.current;

    if (!state.active) return;

    const touch = Array.from(event.changedTouches || []).find(
      (entry) => entry.identifier === state.id,
    );

    if (!touch) return;

    cancelSwipe(touch.identifier);
  };

  // Modal swipe handlers
  const handleModalPointerDown = (event) => {
    startSwipe(event.pointerId, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleModalPointerMove = (event) => {
    updateSwipePosition(event.pointerId, event.clientX, event.clientY);
  };

  const handleModalPointerUp = (event) => {
    finishSwipe(event.pointerId, event.clientX, event.clientY);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleModalPointerCancel = (event) => {
    cancelSwipe(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleModalTouchStart = (event) => {
    if (supportsPointer) return;
    const touch = event.touches?.[0];

    if (!touch) return;

    startSwipe(touch.identifier, touch.clientX, touch.clientY);
  };

  const handleModalTouchMove = (event) => {
    if (supportsPointer) return;
    const state = swipeStateRef.current;

    if (!state.active) return;

    const touch = Array.from(event.touches || []).find(
      (entry) => entry.identifier === state.id,
    );

    if (!touch) return;

    updateSwipePosition(touch.identifier, touch.clientX, touch.clientY);

    if (state.isHorizontal) {
      event.preventDefault();
    }
  };

  const handleModalTouchEnd = (event) => {
    if (supportsPointer) return;
    const state = swipeStateRef.current;

    if (!state.active) return;

    const touch = Array.from(event.changedTouches || []).find(
      (entry) => entry.identifier === state.id,
    );

    if (!touch) return;

    finishSwipe(touch.identifier, touch.clientX, touch.clientY);
  };

  const currentImageSrc = total > 0 ? images[current] : null;
  const currentImageMeta = currentImageSrc
    ? orientations[currentImageSrc]
    : null;

  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-between gap-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[2.3rem] border border-white/5 bg-gradient-to-br from-gray-800/70 via-gray-900/80 to-gray-950 px-4 py-10 shadow-2xl shadow-black/40 backdrop-blur touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
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
                    Math.max(minPortraitWidth, desiredWidth),
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

                    isActive ? "cursor-zoom-in" : "cursor-pointer",
                  )}
                  data-image-index={index}
                  onClick={() => {
                    if (index === current) setIsModalOpen(true);
                    else goTo(index);
                  }}
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
                  style={{ width: figureWidth, height: imageHeight }}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    isActive
                      ? "Produktbild vergrößern"
                      : `Zum ${
                          offset === -1 ? "vorherigen" : "nächsten"
                        } Bild wechseln`
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
                        isActive ? "hover:scale-[1.04]" : "",
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
              data-swipe-ignore="true"
              className="pointer-events-auto h-full w-24 cursor-w-resize rounded-l-[2.5rem] bg-gradient-to-r from-black/30 via-black/0 to-transparent opacity-40 transition hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
              aria-label="Vorheriges Bild"
            >
              <span className="sr-only">Vorheriges Bild</span>
            </button>
            <button
              type="button"
              onClick={next}
              data-swipe-ignore="true"
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
                    : "hover:border-[rgb(204,31,47)]/70",
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

      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-black/40">
          <div className="flex flex-col gap-1 sm:min-w-[12rem]">
          <span className="text-xs uppercase tracking-widest text-white/60">
            Preis
          </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-white">
                {PRICE_IN_EURO.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
            <label
              htmlFor="size-select"
              className="text-xs uppercase tracking-widest text-white/60"
            >
              Größe wählen
            </label>
            <div className="relative w-full sm:w-auto sm:min-w-[7.5rem]">
              <select
                id="size-select"
                value={selectedSize}
                onChange={(event) => onSizeChange?.(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-black/30 transition focus:border-[rgb(204,31,47)] focus:outline-none focus:ring-2 focus:ring-[rgb(204,31,47)]/40 sm:text-right"
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

        {typeof onAddToCart === "function" && (
          <div className="flex w-full sm:w-auto sm:flex-shrink-0 sm:self-end">
            <AddToCartBar
              onAdd={onAddToCart}
              className="w-full sm:w-auto"
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && currentImageSrc ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              ref={modalContainerRef}
              className="relative flex w-full max-w-5xl flex-col items-center gap-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-0 top-0 z-30 flex h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 shadow-lg shadow-black/50 transition hover:bg-white/20 hover:text-white"
                aria-label="Vollbild schließen"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m7 7 10 10" />
                  <path d="m17 7-10 10" />
                </svg>
              </button>

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/80 shadow-lg shadow-black/60 transition hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                    aria-label="Vorheriges Bild"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/80 shadow-lg shadow-black/60 transition hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                    aria-label="Nächstes Bild"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </>
              )}

              <div
                className="relative flex w-full cursor-grab touch-pan-y active:cursor-grabbing"
                onPointerDown={handleModalPointerDown}
                onPointerMove={handleModalPointerMove}
                onPointerUp={handleModalPointerUp}
                onPointerCancel={handleModalPointerCancel}
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
              >
                <motion.div
                  className="relative flex w-full items-center justify-center overflow-hidden rounded-[2rem] bg-gray-900/80 p-4 shadow-2xl shadow-black/70 ring-1 ring-white/10"
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <img
                    src={currentImageSrc}
                    alt={`Produktansicht ${current + 1} im Vollbild`}
                    className={cn(
                      "max-h-[75vh] w-full rounded-[1.4rem] object-contain",
                      currentImageMeta?.orientation === "portrait"
                        ? "h-full w-auto"
                        : "h-full",
                    )}
                    draggable={false}
                  />
                </motion.div>
              </div>

              <div className="flex w-full items-center justify-between text-sm text-white/70">
                <span>
                  Bild {current + 1} von {total}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={total <= 1}
                    className="rounded-full bg-white/10 px-4 py-2 font-semibold text-white/80 transition enabled:hover:bg-white/20 enabled:hover:text-white disabled:opacity-40"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={total <= 1}
                    className="rounded-full bg-[rgb(204,31,47)] px-4 py-2 font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
