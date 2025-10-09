import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient, requireAdminPassword } from "./_adminAuth.js";

const ORDER_TABLE = "orders";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Methode nicht erlaubt" });
  }

  const token = requireAdminPassword(request, response);
  if (!token) {
    return;
  }

  let payload = request.body;
  if (!payload || typeof payload === "string") {
    try {
      payload = JSON.parse(request.body || payload || "{}");
    } catch (error) {
      return response
        .status(400)
        .json({ error: "Ungültige Anfrage. Konnte JSON nicht lesen." });
    }
  }

  const orderCodeRaw = payload?.orderCode ?? payload?.order_hash;
  const orderCode =
    typeof orderCodeRaw === "string"
      ? orderCodeRaw.trim().toUpperCase().slice(0, 64)
      : "";

  if (!orderCode) {
    return response
      .status(400)
      .json({ error: "Bitte gib einen gültigen Bestellcode an." });
  }

  const supabase = getSupabaseAdminClient(createClient);
  if (!supabase) {
    return response.status(500).json({
      error:
        "Supabase ist nicht konfiguriert. Bitte setze SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const { data, error } = await supabase
      .from(ORDER_TABLE)
      .update({
        status: "paid",
      })
      .eq("order_hash", orderCode)
      .select("order_hash, status, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("No rows")) {
        return response
          .status(404)
          .json({
            error: "Es wurde keine Bestellung mit diesem Code gefunden.",
          });
      }
      throw error;
    }

    return response.status(200).json({
      order: data,
      updatedAt: data?.updated_at ?? new Date().toISOString(),
    });
  } catch (updateError) {
    console.error("Admin mark paid error", updateError);
    return response.status(500).json({
      error: "Die Bestellung konnte nicht aktualisiert werden.",
    });
  }
}
