import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, Network } from "lucide-react";
import { api } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [ready, setReady] = useState(false);
  useEffect(() => { api.get("/api/auth/me").then(setUser).catch(() => setUser(null)).finally(() => setReady(true)); }, []);
  const login = async (b) => setUser(await api.post("/api/auth/login", b));
  const register = async (b) => setUser(await api.post("/api/auth/register", b));
  const logout = async () => { await api.post("/api/auth/logout").catch(() => {}); setUser(null); };
  return <Ctx.Provider value={{ user, setUser, ready, login, register, logout }}>{children}</Ctx.Provider>;
}
export function useFetch(path) {
  const [s, set] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => { if (!path) return; set((x) => ({ ...x, loading: true })); api.get(path).then((data) => set({ data, error: null, loading: false })).catch((e) => set({ data: null, error: e.message, loading: false })); }, [path]);
  useEffect(load, [load]);
  return { ...s, reload: load };
}
export const Logo = ({ light }) => (<div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand to-violet grid place-items-center text-white"><Network size={18} /></div><span className={`font-bold tracking-[0.2em] ${light ? "text-white" : "text-navy"}`}>NEXORA</span></div>);
export const Spinner = () => <div className="flex justify-center p-8 text-brand"><Loader2 className="animate-spin" /></div>;
export const ErrorBox = ({ msg }) => msg ? <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{msg}</div> : null;
export const Empty = ({ text }) => <div className="card text-center text-muted text-sm">{text}</div>;
export const Async = ({ f, children }) => f.loading ? <Spinner /> : f.error ? <ErrorBox msg={f.error} /> : children(f.data);
export const Tags = ({ v }) => <div className="flex flex-wrap gap-1">{(v || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="tag">{t}</span>)}</div>;
export const Demo = ({ v }) => v ? <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 ml-2">DEMO</span> : null;
export const Avatar = ({ name }) => <div className="h-10 w-10 shrink-0 rounded-full bg-violet/15 text-violet grid place-items-center font-semibold">{(name || "?")[0]}</div>;
export const MODES = { inter: "Inter-department", intra: "Intra-department", domain: "Domain-specific", industry: "Industry Connect" };
export const ProjectCard = ({ p }) => (
  <Link to={`/projects/${p.id}`} className="card block hover:shadow-md transition">
    <div className="flex items-center justify-between"><span className="tag !bg-teal/10 !text-teal">{MODES[p.collab_type]}</span><span className="text-xs text-muted capitalize">{p.status.replace("_", " ")}</span></div>
    <h3 className="mt-2 font-semibold text-navy">{p.title}</h3><p className="text-sm text-muted line-clamp-2">{p.summary}</p>
    <div className="mt-3"><Tags v={p.skills} /></div>
    <div className="mt-3 text-xs text-muted">{p.owner} · {p.department || "—"}{p.deadline ? ` · due ${p.deadline}` : ""} · {p.members.length} member(s)</div>
  </Link>);
export function RequestBox({ body, label = "Send request", onDone }) {
  const [open, setOpen] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  const send = async () => { setBusy(true); setErr(""); try { await api.post("/api/requests", { ...body, message: msg }); setOk("Request sent."); setOpen(false); setMsg(""); onDone?.(); } catch (e) { setErr(e.message); } setBusy(false); };
  if (ok) return <span className="text-sm text-teal">{ok}</span>;
  return open ? (<div className="space-y-2 w-full"><label className="lbl" htmlFor="rm">Message</label><textarea id="rm" className="inp" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Explain your interest…" /><ErrorBox msg={err} /><div className="flex gap-2"><button className="btn" disabled={busy || !msg.trim()} onClick={send}>{busy ? "Sending…" : "Send"}</button><button className="btn2" onClick={() => setOpen(false)}>Cancel</button></div></div>) : <button className="btn" onClick={() => setOpen(true)}>{label}</button>;
}
export const RecCard = ({ r, project }) => (
  <div className="card"><div className="flex gap-3"><Avatar name={r.user.name} /><div className="flex-1 min-w-0">
    <div className="flex justify-between gap-2"><div><div className="font-semibold text-navy">{r.user.name}</div><div className="text-xs text-muted capitalize">{r.user.role} · {r.user.department || r.user.institution}</div></div><div className="text-right"><div className="text-lg font-bold text-teal">{r.score}%</div><div className="text-[10px] text-muted">match</div></div></div>
    <p className="text-sm mt-2">{r.explanation}</p><div className="mt-2"><Tags v={r.user.skills} /></div>
    <div className="text-xs text-muted mt-2">Interests: {r.user.interests || "—"}</div>
    <div className="mt-3 flex flex-wrap gap-2 items-start"><Link className="btn2" to={`/people/${r.user.id}`}>View profile</Link>
      {project ? <RequestBox body={{ kind: "invite", project_id: project, recipient_id: r.user.id }} label="Invite to project" /> : <RequestBox body={{ kind: "collab", recipient_id: r.user.id }} label="Collaboration request" />}</div></div></div></div>);
