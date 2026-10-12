import { useState } from "react";
import { api } from "../api.js";
import { useFetch, Async, Empty, ErrorBox, Demo, ProjectCard } from "../ui.jsx";
import { Bookmark } from "lucide-react";

export function Opportunities({ savedOnly }) {
  const [cat, setCat] = useState(""); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  const f = useFetch(`/api/opportunities?${new URLSearchParams({ ...(cat && { category: cat }), ...(q && { q }) })}`);
  const toggle = async (o) => { setErr(""); try { o.saved ? await api.del(`/api/opportunities/${o.id}/save`) : await api.post(`/api/opportunities/${o.id}/save`); f.reload(); } catch (e) { setErr(e.message); } };
  return (<div className="max-w-4xl space-y-4"><h1 className="text-xl font-semibold text-navy">{savedOnly ? "Saved Opportunities" : "Opportunities"}</h1>
    <div className="card grid sm:grid-cols-2 gap-2"><input aria-label="Search" className="inp" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Category" className="inp" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{["grant", "conference", "internship", "fellowship", "mentorship", "challenge"].map((c) => <option key={c} value={c}>{c}</option>)}</select></div><ErrorBox msg={err} />
    <Async f={f}>{(d) => { const items = savedOnly ? d.filter((o) => o.saved) : d; return items.length ? items.map((o) => (<div key={o.id} className="card flex gap-3"><div className="flex-1"><div className="font-semibold text-navy">{o.title}<Demo v={o.demo} /></div><div className="text-xs text-muted capitalize">{o.category} · deadline {o.deadline || "not specified"}</div><p className="text-sm mt-1">{o.description}</p>{o.url ? <a className="text-sm text-brand" href={o.url} target="_blank" rel="noreferrer">Official link</a> : <p className="text-xs text-muted mt-1">No verified application link available.</p>}</div>
      <button aria-label={o.saved ? "Remove bookmark" : "Save opportunity"} className="btn2 h-fit" onClick={() => toggle(o)}><Bookmark size={16} fill={o.saved ? "currentColor" : "none"} /></button></div>)) : <Empty text="No opportunities found." />; }}</Async></div>);
}

export function Admin() {
  const stats = useFetch("/api/admin/stats"); const users = useFetch("/api/admin/users"); const projects = useFetch("/api/projects"); const [err, setErr] = useState("");
  const remove = async (id) => { if (!confirm("Archive this project?")) return; setErr(""); try { await api.del(`/api/admin/projects/${id}`); projects.reload(); } catch (e) { setErr(e.message); } };
  return (<div className="max-w-6xl space-y-6"><h1 className="text-xl font-semibold text-navy">Admin Panel</h1><ErrorBox msg={err} />
    <Async f={stats}>{(s) => <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Object.entries(s).map(([k, v]) => <div key={k} className="card"><div className="text-3xl font-bold text-navy">{v}</div><div className="text-sm text-muted capitalize">{k}</div></div>)}</div>}</Async>
    <div className="card overflow-x-auto"><h2 className="font-semibold text-navy mb-2">Users</h2><Async f={users}>{(d) => <table className="w-full text-sm"><thead><tr className="text-left text-muted"><th className="py-1">Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead><tbody>{d.map((u) => <tr key={u.id} className="border-t"><td className="py-1.5">{u.name}</td><td>{u.email}</td><td className="capitalize">{u.role}</td><td>{u.department}</td></tr>)}</tbody></table>}</Async></div>
    <div><h2 className="font-semibold text-navy mb-2">Project moderation</h2><Async f={projects}>{(d) => d.items.length ? <div className="space-y-3">{d.items.map((p) => <div key={p.id} className="flex gap-3 items-center"><div className="flex-1"><ProjectCard p={p} /></div><button className="btn2" onClick={() => remove(p.id)}>Archive</button></div>)}</div> : <Empty text="No published projects." />}</Async></div></div>);
}
