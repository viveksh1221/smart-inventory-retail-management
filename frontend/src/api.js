const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);
export const getToken = () => localStorage.getItem("token");

async function request(path, { method = "GET", body, form, query } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let data;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    data = new URLSearchParams(form);
  } else if (body) {
    headers["Content-Type"] = "application/json";
    data = JSON.stringify(body);
  }
  const url = BASE + path + (query ? "?" + new URLSearchParams(query) : "");
  let res;
  try {
    res = await fetch(url, { method, headers, body: data });
  } catch {
    throw new Error("Can't reach the server. Is the backend running on " + BASE + "?");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const d = json?.detail;
    throw new Error(
      typeof d === "string" ? d
      : Array.isArray(d) ? d.map((e) => `${e.loc.slice(1).join(".")}: ${e.msg}`).join(", ")
      : `Request failed (${res.status})`
    );
  }
  return json;
}

export const login = (username, password) => request("/login", { method: "POST", form: { username, password } });
export const register = (username, password) => request("/register", { method: "POST", body: { username, password } });
export const listProducts = () => request("/products");
export const createProduct = (p) => request("/products", { method: "POST", body: p });
// Backend PUT body nahi, query params leta hai
export const updateProduct = (id, p) => request(`/products/${id}`, { method: "PUT", query: p });
export const deleteProduct = (id) => request(`/products/${id}`, { method: "DELETE" });
