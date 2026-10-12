import { useState, useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, useFetch, Async, Empty, ErrorBox, Avatar } from "../ui.jsx";

const TABS = [["received", "Received"], ["sent", "Sent"], ["join", "Project join requests"], ["invite", "Invitations"], ["notifications", "Notifications"]];
export function Requests() {
  const [sp, setSp] = useSearchParams(); const tab = sp.get("tab") || "received"; const { user } = useAuth();
  const r = useFetch("/api/requests"); const n = useFetch("/api/notifications"); const [err, setErr] = useState("");
  const act = async (id, action) => { setErr(""); try { await api.post(`/api/requests/${id}/respond`, { action }); r.reload(); } catch (e) { setErr(e.message); } };
  const Row = ({ q, incoming }) => (<div className="card flex flex-wrap items-center gap-3"><Avatar name={q.sender.name} /><div className="flex-1 min-w-0"><div className="text-sm"><Link className="font-semibold text-navy" to={`/people/${incoming ? q.sender.id : q.recipient_id}`}>{incoming ? q.sender.name : q.recipient_name}</Link> · <span className="capitalize">{q.kind}</span>{q.project_id && <> · <Link className="text-brand" to={`/projects/${q.project_id}`}>project #{q.project_id}</Link></>}</div><p className="text-sm text-muted">{q.message}</p></div>
    <span className="tag capitalize">{q.status}</span>
    {q.status === "pending" && (incoming ? <><button className="btn" onClick={() => act(q.id, "accept")}>Accept</button><button className="btn2" onClick={() => act(q.id, "decline")}>Decline</button></> : <button className="btn2" onClick={() => act(q.id, "cancel")}>Cancel</button>)}</div>);
  const list = (items, incoming) => items.length ? <div className="space-y-3">{items.map((q) => <Row key={q.id} q={q} incoming={incoming(q)} />)}</div> : <Empty text="Nothing here yet." />;
  return (<div className="max-w-4xl space-y-4"><div className="flex justify-between"><h1 className="text-xl font-semibold text-navy">Mails & Requests</h1><Link className="btn2" to="/messages">Open messages</Link></div>
    <div className="flex flex-wrap gap-2">{TABS.map(([k, l]) => <button key={k} onClick={() => setSp({ tab: k })} className={`rounded-full px-4 py-1.5 text-sm ${tab === k ? "bg-navy text-white" : "bg-white border"}`}>{l}</button>)}</div><ErrorBox msg={err} />
    {tab === "notifications" ? <Async f={n}>{(d) => d.length ? <div className="space-y-2">{d.map((x) => <div key={x.id} className="card text-sm">{x.text}<span className="text-xs text-muted"> · {new Date(x.created).toLocaleString()}</span></div>)}</div> : <Empty text="No notifications." />}</Async>
      : <Async f={r}>{(d) => { const all = [...d.received, ...d.sent]; const inc = (q) => q.recipient_id === user.id;
        if (tab === "received") return list(d.received, () => true); if (tab === "sent") return list(d.sent, () => false);
        return list(all.filter((q) => q.kind === tab), inc); }}</Async>}</div>);
}

export function Chat() {
  const { uid } = useParams(); const { user } = useAuth(); const convs = useFetch("/api/messages"); const [thread, setThread] = useState([]); const [body, setBody] = useState(""); const [err, setErr] = useState(""); const end = useRef();
  const load = () => uid && api.get(`/api/messages/${uid}`).then((d) => { setThread(d); convs.reload(); }).catch((e) => setErr(e.message));
  useEffect(() => { setThread([]); load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [uid]);
  useEffect(() => end.current?.scrollIntoView(), [thread]);
  const send = async (e) => { e.preventDefault(); setErr(""); try { await api.post("/api/messages", { recipient_id: Number(uid), body }); setBody(""); load(); } catch (x) { setErr(x.message); } };
  return (<div className="max-w-5xl grid md:grid-cols-3 gap-4 h-[70vh]"><div className="card overflow-auto !p-2"><h2 className="font-semibold text-navy px-3 py-2">Conversations</h2>
    <Async f={convs}>{(d) => d.length ? d.map((c) => <Link key={c.user.id} to={`/messages/${c.user.id}`} className={`flex gap-2 p-3 rounded-xl hover:bg-slate-50 ${String(c.user.id) === uid ? "bg-slate-100" : ""}`}><Avatar name={c.user.name} /><div className="min-w-0 flex-1"><div className="text-sm font-medium flex justify-between">{c.user.name}{c.unread > 0 && <span className="tag">{c.unread}</span>}</div><div className="text-xs text-muted truncate">{c.last}</div></div></Link>) : <p className="text-sm text-muted p-3">No conversations. Message someone from their profile.</p>}</Async></div>
    <div className="card md:col-span-2 flex flex-col !p-0">{!uid ? <div className="m-auto text-sm text-muted">Select a conversation</div> : (<>
      <div className="flex-1 overflow-auto p-4 space-y-2">{thread.map((m) => <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === user.id ? "ml-auto bg-navy text-white" : "bg-slate-100"}`}>{m.body}<div className={`text-[10px] mt-1 ${m.from === user.id ? "text-white/60" : "text-muted"}`}>{new Date(m.created).toLocaleString()}</div></div>)}<div ref={end} /></div>
      <ErrorBox msg={err} /><form onSubmit={send} className="p-3 border-t flex gap-2"><label className="sr-only" htmlFor="mb">Message</label><input id="mb" className="inp" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" /><button className="btn" disabled={!body.trim()}>Send</button></form></>)}</div></div>);
}
