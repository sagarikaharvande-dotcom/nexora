import { useState } from "react";
import { Routes, Route, NavLink, Navigate, Outlet, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Layers, Briefcase, Rocket, Search, Mail, Sparkles, FolderKanban, UserCircle, Shield, Bell, Menu, LogOut } from "lucide-react";
import { useAuth, useFetch, Logo, Spinner } from "./ui.jsx";
import { Login, Register } from "./pages/auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { Discover, ProjectDetail, ProjectForm, MyProjects } from "./pages/projects.jsx";
import { Directory, PersonProfile, MyProfile } from "./pages/people.jsx";
import { Requests, Chat } from "./pages/inbox.jsx";
import { Opportunities, Admin } from "./pages/misc.jsx";

const NAV = [["/", "Dashboard", LayoutDashboard], ["/inter", "Inter-department", Building2], ["/intra", "Intra-department", Users], ["/domain", "Domain-specific", Layers], ["/industry", "Industry Connect", Briefcase], ["/projects/new", "Launch a Project", Rocket], ["/directory", "Researcher Directory", Search], ["/inbox", "Mails & Requests", Mail], ["/opportunities", "Opportunities", Sparkles], ["/my-projects", "My Projects", FolderKanban], ["/profile", "My Profile", UserCircle]];

function Layout() {
  const { user, logout } = useAuth(); const nav = useNavigate(); const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false);
  const notes = useFetch("/api/notifications"); const unread = (notes.data || []).filter((n) => !n.read).length;
  const items = user.role === "admin" ? [...NAV, ["/admin", "Admin Panel", Shield]] : NAV;
  return (
    <div className="min-h-screen flex">
      <aside className={`fixed lg:static z-30 inset-y-0 left-0 w-64 bg-navy text-white p-4 transition-transform ${open ? "" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-2 py-3"><Logo light /><p className="text-[11px] text-white/60 mt-2">Where Ideas Connect, Innovation Begins.</p></div>
        <nav className="mt-4 space-y-1" aria-label="Main">{items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive ? "bg-white/15 font-medium" : "text-white/75 hover:bg-white/10"}`}><Icon size={17} />{label}</NavLink>))}</nav>
      </aside>
      {open && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
          <form className="flex-1 max-w-md relative" onSubmit={(e) => { e.preventDefault(); nav(`/directory?q=${encodeURIComponent(e.target.q.value)}`); }}>
            <Search size={16} className="absolute left-3 top-2.5 text-muted" /><input name="q" aria-label="Search researchers" className="inp pl-9" placeholder="Search researchers…" /></form>
          <Link to="/inbox?tab=notifications" className="relative p-2" aria-label="Notifications"><Bell size={20} />{unread > 0 && <span className="absolute top-0 right-0 bg-violet text-white text-[10px] rounded-full h-4 min-w-4 px-1 grid place-items-center">{unread}</span>}</Link>
          <div className="relative"><button onClick={() => setMenu(!menu)} className="h-9 w-9 rounded-full bg-brand text-white font-semibold" aria-label="Profile menu">{user.name[0]}</button>
            {menu && <div className="absolute right-0 mt-2 w-48 card !p-2 z-40"><div className="px-2 py-1 text-xs text-muted truncate">{user.email}</div><Link to="/profile" onClick={() => setMenu(false)} className="block px-2 py-1.5 text-sm hover:bg-slate-50 rounded">My Profile</Link><button onClick={logout} className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-50 rounded flex items-center gap-2"><LogOut size={14} />Log out</button></div>}</div>
        </header>
        <main className="p-4 lg:p-8 flex-1"><Outlet /></main>
        <footer className="px-8 py-4 text-xs text-muted border-t">NEXORA — Where Ideas Connect, Innovation Begins.</footer>
      </div>
    </div>);
}
const Private = () => { const { user, ready } = useAuth(); return !ready ? <Spinner /> : user ? <Layout /> : <Navigate to="/login" replace />; };
const AdminOnly = ({ children }) => { const { user } = useAuth(); return user?.role === "admin" ? children : <Navigate to="/" replace />; };

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
      <Route element={<Private />}>
        <Route path="/" element={<Dashboard />} />
        {["inter", "intra", "domain", "industry"].map((m) => <Route key={m} path={`/${m}`} element={<Discover mode={m} />} />)}
        <Route path="/projects" element={<Discover />} />
        <Route path="/projects/new" element={<ProjectForm />} /><Route path="/projects/:id/edit" element={<ProjectForm />} /><Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/directory" element={<Directory />} /><Route path="/people/:id" element={<PersonProfile />} />
        <Route path="/inbox" element={<Requests />} /><Route path="/messages" element={<Chat />} /><Route path="/messages/:uid" element={<Chat />} />
        <Route path="/opportunities" element={<Opportunities />} /><Route path="/saved" element={<Opportunities savedOnly />} />
        <Route path="/my-projects" element={<MyProjects />} /><Route path="/profile" element={<MyProfile />} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>);
}
