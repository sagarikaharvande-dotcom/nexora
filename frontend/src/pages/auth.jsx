import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth, Logo, ErrorBox } from "../ui.jsx";
const Shell = ({ title, children }) => (<div className="min-h-screen grid lg:grid-cols-2">
  <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-navy to-brand text-white p-16"><Logo light /><h1 className="text-4xl font-bold mt-8">Where Ideas Connect, Innovation Begins.</h1><p className="mt-4 text-white/75 max-w-md">Find collaborators across departments, launch research projects and partner with industry.</p></div>
  <div className="flex items-center justify-center p-6"><div className="w-full max-w-md card !p-8"><div className="lg:hidden mb-4"><Logo /></div><h2 className="text-xl font-semibold text-navy mb-4">{title}</h2>{children}</div></div></div>);
const F = ({ label, name, v, set, type = "text", req }) => (<div><label className="lbl" htmlFor={name}>{label}</label><input id={name} className="inp" type={type} required={req} value={v[name] || ""} onChange={(e) => set({ ...v, [name]: e.target.value })} /></div>);
export function Login() {
  const { user, login } = useAuth(); const nav = useNavigate(); const [v, set] = useState({}); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { await login(v); nav("/"); } catch (x) { setErr(x.message); setBusy(false); } };
  return (<Shell title="Sign in"><form onSubmit={submit} className="space-y-3"><F label="Email" name="email" type="email" v={v} set={set} req /><F label="Password" name="password" type="password" v={v} set={set} req /><ErrorBox msg={err} /><button className="btn w-full justify-center" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><p className="text-sm text-muted mt-4">New here? <Link className="text-brand" to="/register">Create an account</Link></p></Shell>);
}
export function Register() {
  const { register } = useAuth(); const nav = useNavigate(); const [v, set] = useState({ role: "student" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { await register(v); nav("/"); } catch (x) { setErr(x.message); setBusy(false); } };
  return (<Shell title="Create your account"><form onSubmit={submit} className="space-y-3">
    <div><label className="lbl" htmlFor="role">I am a</label><select id="role" className="inp" value={v.role} onChange={(e) => set({ ...v, role: e.target.value })}><option value="student">Student</option><option value="faculty">Faculty / Researcher</option><option value="company">Company / Industry Partner</option></select></div>
    <F label="Full name" name="name" v={v} set={set} req /><F label="Email" name="email" type="email" v={v} set={set} req />
    <F label="Institution or organization" name="institution" v={v} set={set} />{v.role !== "company" && <F label="Department" name="department" v={v} set={set} />}
    <F label="Skills (comma-separated)" name="skills" v={v} set={set} /><F label="Research interests (comma-separated)" name="interests" v={v} set={set} />
    <F label="Password (8+ characters)" name="password" type="password" v={v} set={set} req /><F label="Confirm password" name="confirm_password" type="password" v={v} set={set} req />
    <ErrorBox msg={err} /><button className="btn w-full justify-center" disabled={busy}>{busy ? "Creating…" : "Create account"}</button></form><p className="text-sm text-muted mt-4">Already registered? <Link className="text-brand" to="/login">Sign in</Link></p></Shell>);
}
