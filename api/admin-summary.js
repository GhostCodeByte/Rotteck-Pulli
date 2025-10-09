import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient, requireAdminPassword } from "./_adminAuth.js";

const ORDER_TABLE = "orders";

function aggregateOrders(orders) {
  const totals = {
    totalOrders: 0,
    statusCounts: {},
    itemsByColor: {},
    itemsBySize: {},
    itemsByVariant: {},
  };

  const normaliseKey = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  orders.forEach((order) => {
    totals.totalOrders += 1;
    const statusKey = normaliseKey(order.status) || "unbekannt";
    totals.statusCounts[statusKey] = (totals.statusCounts[statusKey] || 0) + 1;

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item) => {
      const colorKey = normaliseKey(item.color) || "unbekannt";
      const sizeKey = normaliseKey(item.size) || "unbekannt";
      const comboKey = `${colorKey}__${sizeKey}`;
      const quantity = Number.isFinite(item.quantity)
        ? Math.max(0, Number.parseInt(item.quantity, 10))
        : 0;

      if (quantity <= 0) return;

      totals.itemsByColor[colorKey] =
        (totals.itemsByColor[colorKey] || 0) + quantity;
      totals.itemsBySize[sizeKey] =
        (totals.itemsBySize[sizeKey] || 0) + quantity;
      totals.itemsByVariant[comboKey] =
        (totals.itemsByVariant[comboKey] || 0) + quantity;
    });
  });

  return totals;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Methode nicht erlaubt" });
  }

  const token = requireAdminPassword(request, response);
  if (!token) {
    return;
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
      .select("order_hash,status,items,created_at,email")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const totals = aggregateOrders(data ?? []);

    return response.status(200).json({
      summary: totals,
      orders: data ?? [],
      generatedAt: new Date().toISOString(),
    });
  } catch (fetchError) {
    console.error("Admin summary error", fetchError);
    return response.status(500).json({
      error: "Die Auswertung konnte nicht geladen werden.",
    });
  }
}
