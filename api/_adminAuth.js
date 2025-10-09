import { timingSafeEqual } from "node:crypto";

let cachedClient;

export function getSupabaseAdminClient(createClient) {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

function safeCompare(expectedSecret, providedSecret) {
  if (typeof expectedSecret !== "string" || !expectedSecret.length) {
    return false;
  }
  if (typeof providedSecret !== "string" || !providedSecret.length) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);

  if (expected.length !== provided.length) {
    return false;
  }

  try {
    return timingSafeEqual(expected, provided);
  } catch (error) {
    return false;
  }
}

export function requireAdminPassword(request, response) {
  const adminPassword = process.env.ADMIN_PORTAL_PASSWORD;

  if (!adminPassword) {
    response.status(500).json({
      error:
        "Admin-Portal ist nicht konfiguriert. Bitte setze ADMIN_PORTAL_PASSWORD auf der Server-Seite.",
    });
    return null;
  }

  const authHeader = request.headers["authorization"] || request.headers["Authorization"];
  if (typeof authHeader !== "string") {
    response.status(401).json({ error: "Nicht autorisiert" });
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    response.status(401).json({ error: "Nicht autorisiert" });
    return null;
  }

  if (!safeCompare(adminPassword, token)) {
    response.status(401).json({ error: "Nicht autorisiert" });
    return null;
  }

  return token;
}
