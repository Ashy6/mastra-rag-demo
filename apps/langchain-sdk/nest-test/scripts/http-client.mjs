const defaultBaseUrl = process.env.RAG_BASE_URL ?? "http://127.0.0.1:3100";

export async function postJson(path, body) {
  const res = await fetch(`${defaultBaseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function getJson(path) {
  const res = await fetch(`${defaultBaseUrl}${path}`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}
