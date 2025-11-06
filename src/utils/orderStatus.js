const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export async function fetchOrderStatuses(entries, { signal } = {}) {
  const sanitised = Array.isArray(entries)
    ? entries
        .map((entry) => {
          const orderCode =
            typeof entry.orderCode === "string"
              ? entry.orderCode.trim().toUpperCase()
              : "";
          const email =
            typeof entry.email === "string" ? entry.email.trim() : "";

          if (!orderCode || !email) {
            return null;
          }

          return {
            orderCode,
            email,
          };
        })
        .filter(Boolean)
    : [];

  if (sanitised.length === 0) {
    return [];
  }

  try {
    const response = await fetch("/api/order-status", {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ entries: sanitised }),
      signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    return results.map((result) => ({
      orderCode: result?.orderCode ?? "",
      email: result?.email ?? "",
      status: typeof result?.status === "string" ? result.status : "pending",
      items: Array.isArray(result?.items) ? result.items : [],
      createdAt: result?.createdAt ?? null,
      updatedAt: result?.updatedAt ?? null,
    }));
  } catch (error) {
    if (error.name === "AbortError") {
      return [];
    }

    console.warn("Konnte Bestellstatus nicht laden:", error);
    return [];
  }
}
