import { Link } from "react-router-dom";
import { Rocket, Building2, Users, Layers, Briefcase } from "lucide-react";
import { useAuth, useFetch, Async, Empty, ProjectCard, RecCard } from "../ui.jsx";
const Stat = ({ label, v }) => <div className="card"><div className="text-3xl font-bold text-navy">{v}</div><div className="text-sm text-muted">{label}</div></div>;
const MODES = [["/inter", "Inter-department", "Find collaborators from other departments.", Building2, "text-brand"], ["/intra", "Intra-department", "Build teams within your department.", Users, "text-teal"], ["/domain", "Domain-specific", "Solve interdisciplinary problems.", Layers, "text-violet"], ["/industry", "Industry Connect", "Work with companies on real challenges.", Briefcase, "text-navy"]];
function Recs({ project }) {
  const f = useFetch(`/api/projects/${project.id}/recommendations`);
  return <Async f={f}>{(d) => d.length ? <div className="grid md:grid-cols-2 gap-4">{d.slice(0, 2).map((r) => <RecCard key={r.user_id} r={r} project={project.id} />)}</div> : <Empty text="No candidates yet." />}</Async>;
}
export default function Dashboard() {
  const { user } = useAuth(); const stats = useFetch("/api/dashboard"); const mine = useFetch("/api/projects/mine"); const all = useFetch("/api/projects");
  const reqs = useFetch("/api/requests"); const msgs = useFetch("/api/messages"); const notes = useFetch("/api/notifications"); const opps = useFetch("/api/opportunities");
  return (<div className="space-y-8 max-w-6xl">
    <div className="card !p-8 bg-gradient-to-r from-navy to-brand text-white"><h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}!</h1><p className="text-white/80 mt-1">Discover researchers, connect across disciplines, and turn your ideas into impact.</p>
      <div className="mt-4 flex gap-3"><Link to="/projects/new" className="btn !bg-white !text-navy"><Rocket size={16} />Launch a Project</Link><Link to="/directory" className="btn2 !bg-transparent !text-white !border-white/50">Explore Collaborators</Link></div></div>
    <Async f={stats}>{(s) => <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat label="Active Projects" v={s.active_projects} /><Stat label="Collaborators" v={s.collaborators} /><Stat label="Pending Requests" v={s.pending_requests} /><Stat label="Saved Opportunities" v={s.saved_opportunities} /></div>}</Async>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{MODES.map(([to, t, d, I, c]) => <Link key={to} to={to} className="card hover:shadow-md transition"><I className={c} /><h3 className="font-semibold mt-2 text-navy">{t}</h3><p className="text-sm text-muted">{d}</p></Link>)}</div>
    <section><h2 className="font-semibold text-navy mb-3">Recommended collaborators</h2>
      <Async f={mine}>{(m) => { const own = m.projects.find((p) => p.owner_id === user.id && p.status !== "archived"); return own ? <><p className="text-xs text-muted mb-2">Matched against your project “{own.title}”.</p><Recs project={own} /></> : <Empty text="Launch a project to get explainable collaborator recommendations." />; }}</Async></section>
    <section><h2 className="font-semibold text-navy mb-3">Recommended projects</h2><Async f={all}>{(d) => d.items.length ? <div className="grid md:grid-cols-3 gap-4">{d.items.slice(0, 3).map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <Empty text="No published projects yet." />}</Async></section>
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card"><h3 className="font-semibold text-navy mb-2">Pending requests</h3><Async f={reqs}>{(d) => { const p = d.received.filter((r) => r.status === "pending"); return p.length ? p.slice(0, 4).map((r) => <Link to="/inbox" key={r.id} className="block text-sm py-1"><b>{r.sender.name}</b> · {r.kind}</Link>) : <p className="text-sm text-muted">Nothing pending.</p>; }}</Async></div>
      <div className="card"><h3 className="font-semibold text-navy mb-2">Recent messages</h3><Async f={msgs}>{(d) => d.length ? d.slice(0, 4).map((c) => <Link to={`/messages/${c.user.id}`} key={c.user.id} className="block text-sm py-1"><b>{c.user.name}</b>{c.unread > 0 && <span className="tag ml-1">{c.unread} new</span>}<div className="text-muted truncate">{c.last}</div></Link>) : <p className="text-sm text-muted">No conversations yet.</p>}</Async></div>
      <div className="card"><h3 className="font-semibold text-navy mb-2">Upcoming deadlines</h3><Async f={mine}>{(m) => { const d = m.projects.filter((p) => p.deadline && p.status !== "archived").sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 4); return d.length ? d.map((p) => <Link to={`/projects/${p.id}`} key={p.id} className="block text-sm py-1">{p.title}<span className="text-muted"> · {p.deadline}</span></Link>) : <p className="text-sm text-muted">No deadlines set.</p>; }}</Async></div>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card"><h3 className="font-semibold text-navy mb-2">Recent activity</h3><Async f={notes}>{(d) => d.length ? d.slice(0, 5).map((n) => <div key={n.id} className="text-sm py-1">{n.text}<span className="text-xs text-muted"> · {new Date(n.created).toLocaleDateString()}</span></div>) : <p className="text-sm text-muted">No activity yet.</p>}</Async></div>
      <div className="card"><h3 className="font-semibold text-navy mb-2">Opportunities</h3><Async f={opps}>{(d) => d.slice(0, 4).map((o) => <Link to="/opportunities" key={o.id} className="block text-sm py-1">{o.title}<span className="text-muted"> · {o.deadline || "no deadline"}</span></Link>)}</Async></div>
    </div></div>);
}
