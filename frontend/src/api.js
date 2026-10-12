const BASE = import.meta.env.VITE_API_URL || "";
async function call(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Cannot reach the backend. Make sure the Flask server is running on port 5000."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}
export const api = { get: (p) => call("GET", p), post: (p, b) => call("POST", p, b || {}), put: (p, b) => call("PUT", p, b), del: (p) => call("DELETE", p) };
