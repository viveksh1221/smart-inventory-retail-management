import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "./api";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const LOW = 10; // is se kam ya barabar stock = "Low"
const FIELDS = ["name", "description", "category", "price", "stock"];

export default function App() {
  const [token, setToken] = useState(api.getToken());
  const [user, setUser] = useState(localStorage.getItem("user"));
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3200);
  }, []);
  const logout = useCallback((expired) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    if (expired === true) notify("Session expired. Sign in again.", true);
  }, [notify]);
  useEffect(() => api.setUnauthorizedHandler(() => logout(true)), [logout]);

  const signIn = (t, u) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", u);
    setToken(t);
    setUser(u);
  };

  return (
    <>
      {token ? <Dashboard user={user} notify={notify} onLogout={() => logout()} /> : <Auth onSignIn={signIn} notify={notify} />}
      {toast && <div className={"toast" + (toast.error ? " err" : "")} role="status">{toast.msg}</div>}
    </>
  );
}

function Auth({ onSignIn, notify }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const switchTo = (m) => { setMode(m); setErr(""); };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (!isLogin) {
        await api.register(f.username, f.password);
        notify("Account created");
      }
      const { access_token } = await api.login(f.username, f.password);
      onSignIn(access_token, f.username);
    } catch (x) {
      setErr(!isLogin && x.message.includes("500") ? "Couldn't create the account. That username may already be taken." : x.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-art">
        <div className="tag">Shelfwise</div>
        <h1>Know what’s on every shelf.</h1>
        <p>Track products, prices and stock in one place.</p>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>{isLogin ? "Sign in" : "Create account"}</h2>
          <div className="seg">
            <button type="button" className={isLogin ? "on" : ""} onClick={() => switchTo("login")}>Sign in</button>
            <button type="button" className={!isLogin ? "on" : ""} onClick={() => switchTo("register")}>Register</button>
          </div>
          <label className="field">Username
            <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoFocus autoComplete="username" />
          </label>
          <label className="field">Password
            <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={isLogin ? undefined : 6} autoComplete={isLogin ? "current-password" : "new-password"} />
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</button>
        </form>
      </section>
    </div>
  );
}

function Dashboard({ user, notify, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("name");
  const [editing, setEditing] = useState(null); // null | {} (new) | product
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems((await api.listProducts()).data);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setLoading(false);
    }
  }, [notify]);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => ["All", ...new Set(items.map((i) => i.category).filter(Boolean))], [items]);
  const maxStock = useMemo(() => Math.max(1, ...items.map((i) => i.stock || 0)), [items]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((i) => (cat === "All" || i.category === cat) && (!s || [i.name, i.description, i.category].some((v) => v?.toLowerCase().includes(s))))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "price" ? b.price - a.price : a.stock - b.stock));
  }, [items, q, cat, sort]);
  const stats = useMemo(() => ({
    count: items.length,
    units: items.reduce((n, i) => n + (i.stock || 0), 0),
    value: items.reduce((n, i) => n + i.price * (i.stock || 0), 0),
    low: items.filter((i) => (i.stock || 0) <= LOW).length,
  }), [items]);

  const save = async (data) => {
    const p = { ...data, price: Number(data.price), stock: Number(data.stock) };
    if (editing.id) await api.updateProduct(editing.id, p);
    else await api.createProduct(p);
    notify(editing.id ? "Product updated" : "Product added");
    setEditing(null);
    load();
  };
  const remove = async () => {
    try {
      await api.deleteProduct(removing.id);
      notify("Product deleted");
      setRemoving(null);
      load();
    } catch (e) {
      notify(e.message, true);
    }
  };

  return (
    <>
      <header className="top">
        <div className="brand"><i /> Shelfwise</div>
        <div className="who">
          <span>{user}</span>
          <button className="btn ghost sm" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main>
        <div className="stats">
          <div><b>{stats.count}</b><span>Products</span></div>
          <div><b>{stats.units.toLocaleString("en-IN")}</b><span>Units in stock</span></div>
          <div><b>{inr.format(stats.value)}</b><span>Stock value</span></div>
          <div className={stats.low ? "low" : ""}><b>{stats.low}</b><span>Low stock (≤ {LOW})</span></div>
        </div>

        <div className="bar">
          <input type="search" placeholder="Search by name, description or category" aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="price">Sort: Price, high to low</option>
            <option value="stock">Sort: Stock, low to high</option>
          </select>
          <button className="btn" onClick={() => setEditing({})}>Add product</button>
        </div>

        <div className="table">
          <table>
            <thead>
              <tr><th>Product</th><th>Category</th><th className="num">Price</th><th>Stock</th><th /></tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const low = (p.stock || 0) <= LOW;
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><small>{p.description}</small></td>
                    <td>{p.category}</td>
                    <td className="num">{inr.format(p.price)}</td>
                    <td>
                      <div className={"stock" + (low ? " low" : "")}>
                        <b>{p.stock}</b>
                        <span className="meter"><i style={{ width: `${Math.min(100, ((p.stock || 0) / maxStock) * 100)}%` }} /></span>
                        {low && <em>Low</em>}
                      </div>
                    </td>
                    <td>
                      <div className="acts">
                        <button className="btn ghost sm" onClick={() => setEditing(p)}>Edit</button>
                        <button className="btn ghost sm" onClick={() => setRemoving(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="empty">Loading products…</p>}
          {!loading && !shown.length && (
            <p className="empty">{items.length ? "No products match your filters." : "No products yet. Add your first product to get started."}</p>
          )}
        </div>
      </main>

      {editing && (
        <Modal label="Product form" onClose={() => setEditing(null)}>
          <h2>{editing.id ? "Edit product" : "Add product"}</h2>
          <ProductForm product={editing} onSave={save} onClose={() => setEditing(null)} />
        </Modal>
      )}
      {removing && (
        <Modal label="Confirm delete" onClose={() => setRemoving(null)}>
          <h2>Delete {removing.name}?</h2>
          <p>This removes the product permanently.</p>
          <div className="acts">
            <button className="btn ghost" onClick={() => setRemoving(null)}>Cancel</button>
            <button className="btn danger" onClick={remove}>Delete product</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ onClose, label, children }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

function ProductForm({ product, onSave, onClose }) {
  const [f, setF] = useState(Object.fromEntries(FIELDS.map((k) => [k, product[k] ?? ""])));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await onSave(f);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label className="field">Name<input value={f.name} onChange={set("name")} required autoFocus /></label>
      <label className="field">Description<input value={f.description} onChange={set("description")} /></label>
      <label className="field">Category<input value={f.category} onChange={set("category")} placeholder="e.g. Grocery" /></label>
      <div className="row">
        <label className="field">Price (₹)<input type="number" min="0" step="1" value={f.price} onChange={set("price")} required /></label>
        <label className="field">Stock<input type="number" min="0" step="1" value={f.stock} onChange={set("stock")} required /></label>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="acts">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
      </div>
    </form>
  );
}
