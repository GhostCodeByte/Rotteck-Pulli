import { useCallback, useMemo, useState } from "react";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

const MAX_ITEMS_ALLOWED = 50;

function sanitisePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const items = Array.isArray(payload.items) ? payload.items : [];

  const safeItems = items.slice(0, MAX_ITEMS_ALLOWED).map((item) => {
    const quantity = Number.isFinite(Number(item.quantity))
      ? Math.max(1, Math.floor(Number(item.quantity)))
      : 1;

    return {
      product: typeof item.product === "string" ? item.product : "Pulli",
      color: typeof item.color === "string" ? item.color : "",
      size: typeof item.size === "string" ? item.size : "",
      quantity,
      studentName:
        typeof item.studentName === "string"
          ? item.studentName.slice(0, 140)
          : "",
    };
  });

  return {
    email,
    items: safeItems,
  };
}

export function useCheckout() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submitOrder = useCallback(async (payload) => {
    const sanitised = sanitisePayload(payload);
    if (!sanitised) {
      const invalidError = new Error("Ungültige Bestelldaten");
      setError(invalidError);
      setStatus("error");
      return null;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(sanitised),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      const payloadBody = isJson ? await response.json() : null;

      if (!response.ok) {
        const message =
          payloadBody?.error?.message ||
          payloadBody?.error ||
          payloadBody?.message ||
          "Die Bestellung konnte nicht gespeichert werden.";
        const fetchError = new Error(message);
        fetchError.status = response.status;
        setError(fetchError);
        setStatus("error");
        return null;
      }

      setResult(payloadBody);
      setStatus("success");
      return payloadBody;
    } catch (fetchError) {
      setError(fetchError);
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return useMemo(
    () => ({
      submitOrder,
      status,
      isLoading: status === "loading",
      isSuccess: status === "success",
      isError: status === "error",
      error,
      result,
      reset,
    }),
    [submitOrder, status, error, result, reset]
  );
}
