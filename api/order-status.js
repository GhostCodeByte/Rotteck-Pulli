import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "./_adminAuth.js";

const ORDER_TABLE = "orders";

function normaliseEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }

  if (typeof body === "object") {
    return body;
  }

  return {};
}

function sanitiseEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  return rawEntries
    .map((entry) => {
      const orderCodeRaw = entry?.orderCode ?? entry?.order_hash;
      const emailRaw = entry?.email ?? entry?.customerEmail;

      const orderCode =
        typeof orderCodeRaw === "string"
          ? orderCodeRaw.trim().toUpperCase().slice(0, 64)
          : "";

      const email = typeof emailRaw === "string" ? emailRaw.trim() : "";

      if (!orderCode || !email) {
        return null;
      }

      return { orderCode, email };
    })
    .filter(Boolean);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Methode nicht erlaubt" });
  }

  const payload = parseRequestBody(request.body);
  const entries = sanitiseEntries(payload?.entries);

  if (entries.length === 0) {
    return response.status(400).json({ error: "Keine gültigen Bestellungen übermittelt." });
  }

  const supabase = getSupabaseAdminClient(createClient);
  if (!supabase) {
    return response.status(500).json({
      error:
        "Supabase ist nicht konfiguriert. Bitte setze SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const uniqueCodes = Array.from(new Set(entries.map((entry) => entry.orderCode)));

  try {
    const { data, error } = await supabase
      .from(ORDER_TABLE)
      .select("order_hash, email, status, items, created_at, updated_at")
      .in("order_hash", uniqueCodes);

    if (error) {
      throw error;
    }

    const dataByCode = new Map(
      (data ?? []).map((row) => [row.order_hash?.toUpperCase(), row])
    );

    const results = entries.map((entry) => {
      const lookup = dataByCode.get(entry.orderCode);
      if (!lookup) {
        return {
          orderCode: entry.orderCode,
          email: entry.email,
          status: "unknown",
          items: [],
          createdAt: null,
          updatedAt: null,
        };
      }

      if (normaliseEmail(lookup.email) !== normaliseEmail(entry.email)) {
        return {
          orderCode: entry.orderCode,
          email: entry.email,
          status: "unauthorised",
          items: [],
          createdAt: null,
          updatedAt: null,
        };
      }

      return {
        orderCode: entry.orderCode,
        email: entry.email,
        status: lookup.status ?? "pending",
        items: Array.isArray(lookup.items) ? lookup.items : [],
        createdAt: lookup.created_at ?? null,
        updatedAt: lookup.updated_at ?? null,
      };
    });

    return response.status(200).json({ results });
  } catch (fetchError) {
    console.error("Order status fetch error", fetchError);
    return response.status(500).json({
      error: "Die Bestellinformationen konnten nicht geladen werden.",
    });
  }
}
