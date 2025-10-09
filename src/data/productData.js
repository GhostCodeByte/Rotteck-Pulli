export const PRODUCT_SLUG = "rotteck-pulli";
export const ACCENT_COLOR = "rgb(204,31,47)";

export const COLOR_VARIANTS = [
  { key: "rot", label: "Rot" },
  { key: "blau", label: "Blau" },
  { key: "schwarz", label: "Schwarz" },
];

export const DEFAULT_COLOR = COLOR_VARIANTS[0]?.key ?? "";
export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
export const PRICE_IN_EURO = 35.0;

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

const FALLBACK_PRODUCT_TEMPLATE = (() => {
  const variantImages = Object.fromEntries(
    Object.entries(VARIANT_IMAGES).map(([key, list]) => [key, [...list]])
  );

  return Object.freeze({
    slug: PRODUCT_SLUG,
    accentColor: ACCENT_COLOR,
    priceEuro: PRICE_IN_EURO,
    sizeOptions: Object.freeze([...SIZE_OPTIONS]),
    colorVariants: Object.freeze(
      COLOR_VARIANTS.map((variant) => Object.freeze({ ...variant }))
    ),
    variantImages: Object.freeze(variantImages),
    defaultColor: DEFAULT_COLOR,
    source: "fallback",
  });
})();

function cloneColorVariants(list) {
  return list.map((variant) => ({ ...variant }));
}

function cloneVariantImages(map) {
  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, [...value]])
  );
}

export function getFallbackProduct() {
  return {
    slug: FALLBACK_PRODUCT_TEMPLATE.slug,
    accentColor: FALLBACK_PRODUCT_TEMPLATE.accentColor,
    priceEuro: FALLBACK_PRODUCT_TEMPLATE.priceEuro,
    sizeOptions: [...FALLBACK_PRODUCT_TEMPLATE.sizeOptions],
    colorVariants: cloneColorVariants(FALLBACK_PRODUCT_TEMPLATE.colorVariants),
    variantImages: cloneVariantImages(FALLBACK_PRODUCT_TEMPLATE.variantImages),
    defaultColor: FALLBACK_PRODUCT_TEMPLATE.defaultColor,
    source: FALLBACK_PRODUCT_TEMPLATE.source,
  };
}

function pickFirstNonEmpty(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return trimmed;
      continue;
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
    if (
      candidate &&
      typeof candidate === "object" &&
      Object.keys(candidate).length > 0
    ) {
      return candidate;
    }
  }
  return undefined;
}

function normaliseVariantList(rawVariants, fallbackVariants) {
  if (!Array.isArray(rawVariants)) return cloneColorVariants(fallbackVariants);

  const variants = rawVariants
    .map((entry, index) => {
      if (!entry) return null;
      const candidateKey = pickFirstNonEmpty(
        entry.key,
        entry.id,
        entry.slug,
        entry.value
      );
      const key =
        typeof candidateKey === "number"
          ? String(candidateKey)
          : typeof candidateKey === "string"
          ? candidateKey.trim()
          : "";
      if (!key) return null;

      const labelCandidate = pickFirstNonEmpty(
        entry.label,
        entry.name,
        entry.title,
        key
      );
      const label =
        typeof labelCandidate === "string"
          ? labelCandidate.trim()
          : `Variante ${index + 1}`;

      return { key, label };
    })
    .filter(Boolean);

  if (variants.length === 0) {
    return cloneColorVariants(fallbackVariants);
  }

  return variants;
}

function normaliseSizeOptions(rawSizes, fallbackSizes) {
  if (!Array.isArray(rawSizes)) return [...fallbackSizes];
  const sizes = rawSizes
    .map((size) => {
      if (typeof size === "number") return String(size);
      if (typeof size === "string") return size.trim();
      return null;
    })
    .filter(Boolean);

  if (sizes.length === 0) return [...fallbackSizes];
  return sizes;
}

function normaliseVariantImages(rawImages, fallbackImages, variants) {
  const base = cloneVariantImages(fallbackImages);

  if (!rawImages || typeof rawImages !== "object" || Array.isArray(rawImages)) {
    return base;
  }

  Object.entries(rawImages).forEach(([variantKey, list]) => {
    if (!variantKey) return;
    if (!Array.isArray(list)) return;
    const urls = list
      .map((entry) => {
        if (typeof entry === "string") {
          const trimmed = entry.trim();
          return trimmed.length > 0 ? trimmed : null;
        }
        if (entry && typeof entry === "object") {
          const url = pickFirstNonEmpty(entry.url, entry.path, entry.href);
          return typeof url === "string" && url.length > 0 ? url : null;
        }
        return null;
      })
      .filter(Boolean);
    if (urls.length > 0) {
      base[variantKey] = urls;
    }
  });

  variants.forEach(({ key }) => {
    if (!base[key]) {
      base[key] = [];
    }
  });

  return base;
}

export function normaliseProductCatalogPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const fallback = getFallbackProduct();

  const priceCandidate = pickFirstNonEmpty(
    payload.price_eur,
    payload.priceEuro,
    payload.price
  );
  const parsedPrice = Number.parseFloat(priceCandidate);
  const priceEuro = Number.isFinite(parsedPrice)
    ? parsedPrice
    : fallback.priceEuro;

  const sizeOptions = normaliseSizeOptions(
    pickFirstNonEmpty(payload.size_options, payload.sizeOptions),
    fallback.sizeOptions
  );

  const colorVariants = normaliseVariantList(
    pickFirstNonEmpty(payload.color_variants, payload.colorVariants),
    fallback.colorVariants
  );

  const variantImages = normaliseVariantImages(
    pickFirstNonEmpty(payload.variant_images, payload.variantImages),
    fallback.variantImages,
    colorVariants
  );

  const accentColor =
    pickFirstNonEmpty(payload.accent_color, payload.accentColor) ??
    fallback.accentColor;

  const defaultColorCandidate = pickFirstNonEmpty(
    payload.default_color,
    payload.defaultColor
  );

  const defaultColor = colorVariants.some(
    (variant) => variant.key === defaultColorCandidate
  )
    ? defaultColorCandidate
    : colorVariants[0]?.key ?? fallback.defaultColor;

  return {
    slug:
      typeof payload.slug === "string" && payload.slug.trim().length > 0
        ? payload.slug.trim()
        : fallback.slug,
    accentColor,
    priceEuro,
    sizeOptions,
    colorVariants,
    variantImages,
    defaultColor,
    source: "supabase",
    updatedAt:
      typeof payload.updated_at === "string"
        ? payload.updated_at
        : payload.updatedAt ?? null,
  };
}
