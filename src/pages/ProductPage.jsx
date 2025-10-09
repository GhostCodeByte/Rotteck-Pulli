import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import ProductShowcase from "../components/ProductShowcase.jsx";
import AddToCartBar from "../components/AddToCartBar.jsx";
import {
  COLOR_VARIANTS,
  DEFAULT_COLOR,
  SIZE_OPTIONS,
} from "../data/productData.js";
import { useCart } from "../context/CartContext.jsx";

const DEFAULT_SIZE = SIZE_OPTIONS.includes("M") ? "M" : SIZE_OPTIONS[0];
const FEEDBACK_TIMEOUT_MS = 3200;

export default function ProductPage() {
  const [activeColor, setActiveColor] = useState(
    COLOR_VARIANTS.some((variant) => variant.key === DEFAULT_COLOR)
      ? DEFAULT_COLOR
      : COLOR_VARIANTS[0]?.key ?? ""
  );
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZE);
  const [feedback, setFeedback] = useState(null);
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({ color: activeColor, size: selectedSize });
    const colorLabel =
      COLOR_VARIANTS.find((variant) => variant.key === activeColor)?.label ??
      activeColor;
    setFeedback({
      id: Date.now(),
      colorLabel,
      size: selectedSize,
    });
  };

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, FEEDBACK_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [feedback]);

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 flex-col gap-6">
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4"
            role="status"
            aria-live="assertive"
          >
            <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-gray-900/95 px-4 py-3 text-sm shadow-2xl shadow-black/60 backdrop-blur">
              <SuccessIcon className="mt-0.5 h-5 w-5 flex-none text-[rgb(47,235,173)]" />
              <div className="flex-1">
                <p className="font-semibold text-white">Zum Warenkorb hinzugefügt</p>
                <p className="mt-0.5 text-white/70">
                  Pulli · Größe {feedback.size} · Farbe {feedback.colorLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="-mr-1 rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Hinweis schließen"
              >
                <DismissIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-1 items-center justify-center">
        <ProductShowcase
          activeColor={activeColor}
          onColorChange={setActiveColor}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
        />
      </div>
      <AddToCartBar onAdd={handleAddToCart} className="mt-auto" />
    </div>
  );
}

function SuccessIcon({ className = "h-5 w-5", ...props }) {
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
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path
        d="m8.5 12 2.5 2.5 5-5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DismissIcon({ className = "h-4 w-4", ...props }) {
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
      <path d="M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
