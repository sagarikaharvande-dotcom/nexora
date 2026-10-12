import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, useFetch, Async, Empty, ErrorBox, Avatar, Tags, RequestBox, ProjectCard } from "../ui.jsx";

export function Directory() {
  const [sp] = useSearchParams(); const [f, setF] = useState({ q: sp.get("q") || "" });
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v))).toString(); const res = useFetch(`/api/users?${qs}`);
  const I = (k, ph) => <input aria-label={ph} className="inp" placeholder={ph} value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />;
  return (<div className="max-w-6xl space-y-4"><h1 className="text-xl font-semibold text-navy">Researcher Directory</h1>
    <div className="card grid sm:grid-cols-2 lg:grid-cols-5 gap-2">{I("q", "Search")}{I("department", "Department")}{I("institution", "Institution")}{I("skills", "Skill")}
      <select aria-label="Role" className="inp" value={f.role || ""} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="">Any role</option><option value="student">Student</option><option value="faculty">Faculty</option><option value="company">Company</option></select></div>
    <Async f={res}>{(d) => d.items.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{d.items.map((u) => <Link to={`/people/${u.id}`} key={u.id} className="card hover:shadow-md flex gap-3"><Avatar name={u.name} /><div className="min-w-0"><div className="font-semibold text-navy">{u.name}</div><div className="text-xs text-muted capitalize">{u.role} · {u.department || u.institution}</div><div className="mt-2"><Tags v={u.skills} /></div></div></Link>)}</div> : <Empty text="No researchers found." />}</Async></div>);
}
export function PersonProfile() {
  const { id } = useParams(); const { user } = useAuth(); const f = useFetch(`/api/users/${id}`);
  return <Async f={f}>{(d) => <Profile u={d.user} projects={d.projects} me={user} />}</Async>;
}
function Profile({ u, projects, me }) {
  return (<div className="max-w-3xl space-y-4"><div className="card flex gap-4"><Avatar name={u.name} /><div className="flex-1"><h1 className="text-xl font-bold text-navy">{u.name}</h1><div className="text-sm text-muted capitalize">{u.role} · {u.institution} {u.department && `· ${u.department}`}{u.is_demo && " · demo profile"}</div>
    <p className="text-sm mt-3">{u.bio || "No biography provided."}</p><div className="mt-3 space-y-2"><div><span className="lbl">Skills</span><Tags v={u.skills} /></div><div><span className="lbl">Research interests</span><Tags v={u.interests} /></div><div><span className="lbl">Domains</span><Tags v={u.domains} /></div></div>
    {u.link && <a className="text-sm text-brand block mt-2" href={u.link} target="_blank" rel="noreferrer">Portfolio</a>}
    {u.id !== me.id && <div className="mt-4 flex flex-wrap gap-2 items-start"><RequestBox body={{ kind: "collab", recipient_id: u.id }} label="Send Collaboration Request" /><Link className="btn2" to={`/messages/${u.id}`}>Message</Link></div>}</div></div>
    <h2 className="font-semibold text-navy">Published projects</h2>{projects.length ? <div className="grid md:grid-cols-2 gap-4">{projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <Empty text="No published projects." />}</div>);
}
export function MyProfile() {
  const { user, setUser } = useAuth(); const [v, set] = useState({ ...user }); const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [pw, setPw] = useState({});
  const save = async (e) => { e.preventDefault(); setErr(""); setMsg(""); try { setUser(await api.put("/api/profile", v)); setMsg("Profile saved."); } catch (x) { setErr(x.message); } };
  const chPw = async (e) => { e.preventDefault(); setErr(""); setMsg(""); try { await api.post("/api/profile/password", pw); setPw({}); setMsg("Password changed."); } catch (x) { setErr(x.message); } };
  const T = (k, l, rows) => <div><label className="lbl" htmlFor={"p" + k}>{l}</label>{rows ? <textarea id={"p" + k} rows={rows} className="inp" value={v[k] || ""} onChange={(e) => set({ ...v, [k]: e.target.value })} /> : <input id={"p" + k} className="inp" value={v[k] || ""} onChange={(e) => set({ ...v, [k]: e.target.value })} />}</div>;
  return (<div className="max-w-2xl space-y-4"><h1 className="text-xl font-semibold text-navy">My Profile</h1><ErrorBox msg={err} />{msg && <div className="rounded-xl bg-teal/10 text-teal text-sm p-3">{msg}</div>}
    <form onSubmit={save} className="card space-y-3">{T("name", "Full name")}{T("institution", "Institution")}{T("department", "Department")}{T("skills", "Skills (comma-separated)")}{T("interests", "Research interests (comma-separated)")}{T("domains", "Domains (comma-separated)")}{T("bio", "Biography", 3)}{T("link", "Portfolio / publications URL")}<button className="btn">Save profile</button></form>
    <form onSubmit={chPw} className="card space-y-3"><h2 className="font-semibold text-navy">Change password</h2><div><label className="lbl" htmlFor="cur">Current password</label><input id="cur" type="password" className="inp" value={pw.current || ""} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div><div><label className="lbl" htmlFor="new">New password</label><input id="new" type="password" className="inp" value={pw.new || ""} onChange={(e) => setPw({ ...pw, new: e.target.value })} /></div><button className="btn">Update password</button></form></div>);
}
