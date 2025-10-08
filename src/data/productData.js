export const ACCENT_COLOR = "rgb(204,31,47)";

export const COLOR_VARIANTS = [
  { key: "rot", label: "Rot" },
  { key: "blau", label: "Blau" },
  { key: "schwarz", label: "Schwarz" },
];

export const DEFAULT_COLOR = COLOR_VARIANTS[0]?.key ?? "";

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

const productImageModules = import.meta.glob(
  "../assets/products/*/*.{png,jpg,jpeg,webp,avif,svg}",
  { eager: true }
);

export const VARIANT_IMAGES = (() => {
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

export const PRICE_IN_EURO = 35.0;
