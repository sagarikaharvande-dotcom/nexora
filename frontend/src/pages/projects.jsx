import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, useFetch, Async, Empty, ErrorBox, ProjectCard, RecCard, RequestBox, Tags, MODES } from "../ui.jsx";

export function Discover({ mode }) {
  const [f, setF] = useState({}); const qs = new URLSearchParams({ ...(mode ? { mode } : {}), ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }).toString();
  const res = useFetch(`/api/projects?${qs}`);
  const I = (k, ph) => <input aria-label={ph} className="inp" placeholder={ph} value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />;
  return (<div className="max-w-6xl space-y-4"><div className="flex justify-between items-center"><h1 className="text-xl font-semibold text-navy">{mode ? MODES[mode] + " Collaboration" : "Project Discovery"}</h1><Link className="btn" to="/projects/new">Launch a Project</Link></div>
    <div className="card grid sm:grid-cols-2 lg:grid-cols-5 gap-2">{I("q", "Search")}{I("department", "Department")}{I("domains", "Domain")}{I("skills", "Skill")}
      <select aria-label="Status" className="inp" value={f.status || ""} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Any status</option><option value="published">Published</option><option value="in_progress">In progress</option></select></div>
    <Async f={res}>{(d) => d.items.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{d.items.map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <Empty text="No projects match these filters." />}</Async></div>);
}

export function ProjectDetail() {
  const { id } = useParams(); const { user } = useAuth(); const nav = useNavigate(); const f = useFetch(`/api/projects/${id}`); const [err, setErr] = useState("");
  const archive = async () => { if (!confirm("Archive this project?")) return; try { await api.post(`/api/projects/${id}/archive`); f.reload(); } catch (e) { setErr(e.message); } };
  return <Async f={f}>{(p) => { const owner = p.owner_id === user.id, admin = user.role === "admin", member = p.members.some((m) => m.id === user.id); return (
    <div className="max-w-4xl space-y-4"><div className="card"><div className="flex flex-wrap justify-between gap-2"><span className="tag !bg-teal/10 !text-teal">{MODES[p.collab_type]}</span><span className="text-sm capitalize text-muted">{p.status.replace("_", " ")}</span></div>
      <h1 className="text-2xl font-bold text-navy mt-2">{p.title}</h1><p className="text-muted">{p.summary}</p><p className="mt-4 whitespace-pre-wrap text-sm">{p.description || "No detailed description yet."}</p>
      <dl className="grid sm:grid-cols-2 gap-3 mt-4 text-sm"><div><dt className="lbl">Owner</dt>{p.owner}</div><div><dt className="lbl">Deadline</dt>{p.deadline || "—"}</div><div><dt className="lbl">Department</dt>{p.department || "—"}</div><div><dt className="lbl">Team size</dt>{p.members.length} / {p.team_size}</div><div><dt className="lbl">Domains</dt><Tags v={p.domains} /></div><div><dt className="lbl">Required skills</dt><Tags v={p.skills} /></div></dl>
      <ErrorBox msg={err} /><div className="mt-4 flex flex-wrap gap-2 items-start">{(owner || admin) && p.status !== "archived" && <><Link className="btn2" to={`/projects/${p.id}/edit`}>Edit</Link><button className="btn2" onClick={archive}>Archive</button></>}
        {!owner && !member && ["published", "in_progress"].includes(p.status) && <RequestBox body={{ kind: "join", project_id: p.id }} label="Request to join" />}
        {!owner && <Link className="btn2" to={`/messages/${p.owner_id}`}>Message owner</Link>}</div></div>
      <div className="card"><h2 className="font-semibold text-navy mb-2">Team</h2><div className="flex flex-wrap gap-3">{p.members.map((m) => <Link key={m.id} to={`/people/${m.id}`} className="tag !text-sm !px-3 !py-1">{m.name}</Link>)}</div></div>
      {owner && <Recommendations id={p.id} />}</div>); }}</Async>;
}
function Recommendations({ id }) {
  const f = useFetch(`/api/projects/${id}/recommendations`);
  return <div><h2 className="font-semibold text-navy mb-2">Recommended collaborators</h2><Async f={f}>{(d) => d.length ? <div className="grid md:grid-cols-2 gap-4">{d.map((r) => <RecCard key={r.user_id} r={r} project={id} />)}</div> : <Empty text="No candidates available." />}</Async></div>;
}

const empty = { title: "", summary: "", description: "", domains: "", skills: "", collab_type: "domain", team_size: 4, deadline: "", department: "", status: "draft" };
export function ProjectForm() {
  const { id } = useParams(); const nav = useNavigate(); const [v, set] = useState(empty); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (id) api.get(`/api/projects/${id}`).then((p) => set({ ...empty, ...p, deadline: p.deadline || "" })).catch((e) => setErr(e.message)); }, [id]);
  const save = async (status) => { setBusy(true); setErr(""); const body = { ...v, status: status || v.status }; if (!body.deadline) delete body.deadline;
    try { const p = id ? await api.put(`/api/projects/${id}`, body) : await api.post("/api/projects", body); nav(`/projects/${p.id}`); } catch (e) { setErr(e.message); setBusy(false); } };
  const T = (k, label, rows) => <div><label className="lbl" htmlFor={k}>{label}</label>{rows ? <textarea id={k} rows={rows} className="inp" value={v[k] || ""} onChange={(e) => set({ ...v, [k]: e.target.value })} /> : <input id={k} className="inp" value={v[k] || ""} onChange={(e) => set({ ...v, [k]: e.target.value })} />}</div>;
  return (<div className="max-w-3xl card space-y-3"><h1 className="text-xl font-semibold text-navy">{id ? "Edit project" : "Launch a Project"}</h1>
    {T("title", "Project title *")}{T("summary", "Short summary *")}{T("description", "Detailed description, problem statement and objectives *", 6)}{T("domains", "Research domains (comma-separated) *")}{T("skills", "Required skills (comma-separated) *")}{T("department", "Department")}
    <div className="grid sm:grid-cols-3 gap-3"><div><label className="lbl" htmlFor="ct">Collaboration type</label><select id="ct" className="inp" value={v.collab_type} disabled={!!id} onChange={(e) => set({ ...v, collab_type: e.target.value })}>{Object.entries(MODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div><label className="lbl" htmlFor="ts">Team size</label><input id="ts" type="number" min="1" className="inp" value={v.team_size} onChange={(e) => set({ ...v, team_size: e.target.value })} /></div>
      <div><label className="lbl" htmlFor="dl">Deadline</label><input id="dl" type="date" className="inp" value={v.deadline} onChange={(e) => set({ ...v, deadline: e.target.value })} /></div></div>
    <ErrorBox msg={err} /><div className="flex gap-2"><button className="btn2" disabled={busy} onClick={() => save("draft")}>Save draft</button><button className="btn" disabled={busy} onClick={() => save("published")}>{busy ? "Saving…" : "Publish"}</button></div></div>);
}

export function MyProjects() {
  const f = useFetch("/api/projects/mine");
  return (<div className="max-w-6xl space-y-6"><h1 className="text-xl font-semibold text-navy">My Projects</h1><Async f={f}>{(d) => (<>
    {d.projects.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{d.projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <Empty text="You have no projects yet." />}
    <h2 className="font-semibold text-navy">Pending join requests</h2>{d.pending_join_requests.length ? d.pending_join_requests.map((r) => <div key={r.id} className="card text-sm"><Link className="text-brand" to={`/projects/${r.project_id}`}>Project #{r.project_id}</Link> · awaiting {r.recipient_name}</div>) : <Empty text="No pending join requests." />}</>)}</Async></div>);
}
