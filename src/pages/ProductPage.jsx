import { useState } from "react";

import ProductShowcase from "../components/ProductShowcase.jsx";
import AddToCartBar from "../components/AddToCartBar.jsx";
import {
  COLOR_VARIANTS,
  DEFAULT_COLOR,
  SIZE_OPTIONS,
} from "../data/productData.js";
import { useCart } from "../context/CartContext.jsx";

const DEFAULT_SIZE = SIZE_OPTIONS.includes("M") ? "M" : SIZE_OPTIONS[0];

export default function ProductPage() {
  const [activeColor, setActiveColor] = useState(
    COLOR_VARIANTS.some((variant) => variant.key === DEFAULT_COLOR)
      ? DEFAULT_COLOR
      : COLOR_VARIANTS[0]?.key ?? ""
  );
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZE);
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({ color: activeColor, size: selectedSize });
  };

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 flex-col gap-6">
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
