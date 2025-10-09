import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const MAX_ITEMS = 50;
const ORDER_TABLE = "orders";
const PRODUCT_NAME = "Pulli";

let cachedClient;

function getSupabaseAdminClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitiseItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") return null;

  const color =
    typeof rawItem.color === "string"
      ? rawItem.color.trim().slice(0, 48)
      : "";
  const size =
    typeof rawItem.size === "string" ? rawItem.size.trim().slice(0, 24) : "";
  if (!color || !size) return null;

  const quantityValue = Number.parseInt(rawItem.quantity, 10);
  const quantity = Number.isFinite(quantityValue)
    ? Math.min(30, Math.max(1, quantityValue))
    : 1;

  return {
    product: PRODUCT_NAME,
    color,
    size,
    quantity,
  };
}

function hashOrder(email, items) {
  const seed = JSON.stringify({
    email,
    items,
    nonce: randomBytes(16).toString("hex"),
  });
  return createHash("sha256").update(seed).digest("hex").slice(0, 12).toUpperCase();
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Methode nicht erlaubt" });
  }

  let payload = request.body;
  if (!payload) {
    try {
      payload = JSON.parse(request.body || "{}");
    } catch (parseError) {
      return response
        .status(400)
        .json({ error: "Ungültige Anfrage. Konnte JSON nicht lesen." });
    }
  }

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (parseError) {
      return response
        .status(400)
        .json({ error: "Ungültige Anfrage. Konnte JSON nicht lesen." });
    }
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!isValidEmail(email)) {
    return response
      .status(400)
      .json({ error: "Bitte gib eine gültige E-Mail-Adresse an." });
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const sanitisedItems = rawItems
    .slice(0, MAX_ITEMS)
    .map(sanitiseItem)
    .filter(Boolean);

  if (sanitisedItems.length === 0) {
    return response
      .status(400)
      .json({ error: "Es wurden keine gültigen Produkte übermittelt." });
  }

  const totalQuantity = sanitisedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (totalQuantity <= 0) {
    return response
      .status(400)
      .json({ error: "Die Bestellmenge muss größer als Null sein." });
  }

  const orderHash = hashOrder(email, sanitisedItems);

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return response.status(500).json({
      error:
        "Supabase ist nicht konfiguriert. Bitte setze SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const { data, error } = await supabase
      .from(ORDER_TABLE)
      .insert(
        {
          email,
          items: sanitisedItems,
          order_hash: orderHash,
          status: "pending",
        },
        { returning: "representation" }
      )
      .select("order_hash, created_at")
      .single();

    if (error) {
      console.error("Supabase Insert Error", error);
      return response.status(500).json({
        error: "Die Bestellung konnte nicht gespeichert werden.",
      });
    }

    return response.status(201).json({
      orderCode: data?.order_hash ?? orderHash,
      createdAt: data?.created_at ?? new Date().toISOString(),
    });
  } catch (insertError) {
    console.error("Supabase Bestellung fehlgeschlagen", insertError);
    return response.status(500).json({
      error: "Beim Speichern deiner Bestellung ist ein Fehler aufgetreten.",
    });
  }
}
