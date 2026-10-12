import os, functools
from datetime import datetime, date
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_, UniqueConstraint
from werkzeug.security import generate_password_hash, check_password_hash
import matching
load_dotenv()
app = Flask(__name__)
app.config.update(SECRET_KEY=os.environ.get("SECRET_KEY") or os.urandom(32).hex(),
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL", "sqlite:///nexora.db"),
    SESSION_COOKIE_HTTPONLY=True,
SESSION_COOKIE_SAMESITE="None",
SESSION_COOKIE_SECURE=True
CORS(app, supports_credentials=True, origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")])
db = SQLAlchemy(app)
ROLES = {"student", "faculty", "company"}   # 'admin' can never be self-assigned
MODES = {"inter", "intra", "domain", "industry"}

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    pw_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)
    institution = db.Column(db.String(160), default="")
    department = db.Column(db.String(120), default="", index=True)
    skills = db.Column(db.Text, default="")      # comma-separated tags (limitation: not normalized tables)
    interests = db.Column(db.Text, default="")
    domains = db.Column(db.Text, default="")
    bio = db.Column(db.Text, default="")
    link = db.Column(db.String(255), default="")
    is_demo = db.Column(db.Boolean, default=False)
    created = db.Column(db.DateTime, default=datetime.utcnow)
    def pub(self, full=False):
        d = {k: getattr(self, k) for k in "id name role institution department skills interests domains bio link is_demo".split()}
        if full: d["email"] = self.email
        return d

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, default="")
    domains = db.Column(db.Text, default="")
    skills = db.Column(db.Text, default="")
    collab_type = db.Column(db.String(20), nullable=False, index=True)
    institution = db.Column(db.String(160), default="")
    department = db.Column(db.String(120), default="", index=True)
    team_size = db.Column(db.Integer, default=4)
    deadline = db.Column(db.Date)
    status = db.Column(db.String(20), default="draft", index=True)  # draft|published|in_progress|completed|archived
    created = db.Column(db.DateTime, default=datetime.utcnow)
    owner = db.relationship("User")
    def pub(self):
        d = {k: getattr(self, k) for k in "id owner_id title summary description domains skills collab_type institution department team_size status".split()}
        d["deadline"] = self.deadline.isoformat() if self.deadline else None
        d["owner"] = self.owner.name
        d["members"] = [m.user.pub() for m in Member.query.filter_by(project_id=self.id)]
        return d

class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    __table_args__ = (UniqueConstraint("project_id", "user_id"),)
    user = db.relationship("User")

class Req(db.Model):
    """kind: collab (person->person) | join (user->project) | invite (owner->user)"""
    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(10), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"))
    message = db.Column(db.Text, default="")
    status = db.Column(db.String(10), default="pending", index=True)  # pending|accepted|declined|cancelled
    created = db.Column(db.DateTime, default=datetime.utcnow)
    sender = db.relationship("User", foreign_keys=[sender_id])
    def pub(self):
        return {"id": self.id, "kind": self.kind, "sender": self.sender.pub(), "recipient_id": self.recipient_id,
                "recipient_name": db.session.get(User, self.recipient_id).name, "project_id": self.project_id, "message": self.message, "status": self.status, "created": self.created.isoformat()}

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    text = db.Column(db.String(300), nullable=False)
    read = db.Column(db.Boolean, default=False)
    created = db.Column(db.DateTime, default=datetime.utcnow)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False)
    created = db.Column(db.DateTime, default=datetime.utcnow)

class Opportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(40), index=True)
    description = db.Column(db.Text, default="")
    deadline = db.Column(db.Date)
    url = db.Column(db.String(255), default="")   # left empty for demo items: no invented links
    is_demo = db.Column(db.Boolean, default=True)

class Saved(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    opp_id = db.Column(db.Integer, db.ForeignKey("opportunity.id"), nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "opp_id"),)

# ---------- helpers ----------
def err(msg, code=400): return jsonify(error=msg), code
def me(): return db.session.get(User, session["uid"]) if "uid" in session else None
def login_required(f):
    @functools.wraps(f)
    def w(*a, **k):
        if not me(): return err("Login required", 401)
        return f(*a, **k)
    return w
def admin_required(f):
    @functools.wraps(f)
    @login_required
    def w(*a, **k):
        if me().role != "admin": return err("Administrator access required", 403)
        return f(*a, **k)
    return w
def notify(uid, text): db.session.add(Notification(user_id=uid, text=text[:300]))
def clean(v, n=2000): return (v or "").strip()[:n] if isinstance(v, str) else ""
PROFILE_FIELDS = "institution department skills interests domains bio link".split()

# ---------- auth ----------
@app.post("/api/auth/register")
def register():
    d = request.get_json(silent=True) or {}
    email, pw, role, name = clean(d.get("email"), 255).lower(), d.get("password") or "", d.get("role"), clean(d.get("name"), 120)
    if role not in ROLES: return err("Role must be student, faculty or company")
    if not name or "@" not in email: return err("Valid name and email are required")
    if len(pw) < 8 or pw != d.get("confirm_password"): return err("Password must be 8+ characters and match confirmation")
    if User.query.filter_by(email=email).first(): return err("Email already registered", 409)
    u = User(email=email, pw_hash=generate_password_hash(pw), name=name, role=role,
             **{f: clean(d.get(f)) for f in PROFILE_FIELDS})
    db.session.add(u); db.session.commit(); session["uid"] = u.id
    return jsonify(u.pub(True)), 201

@app.post("/api/auth/login")
def login():
    d = request.get_json(silent=True) or {}
    u = User.query.filter_by(email=clean(d.get("email"), 255).lower()).first()
    if not u or not check_password_hash(u.pw_hash, d.get("password") or ""): return err("Invalid email or password", 401)
    session["uid"] = u.id
    return jsonify(u.pub(True))

@app.post("/api/auth/logout")
def logout(): session.clear(); return jsonify(ok=True)

@app.get("/api/auth/me")
@login_required
def whoami(): return jsonify(me().pub(True))

@app.put("/api/profile")
@login_required
def edit_profile():
    d, u = request.get_json(silent=True) or {}, me()
    for f in PROFILE_FIELDS + ["name"]:           # role is deliberately not editable
        if f in d and clean(d[f]): setattr(u, f, clean(d[f]))
        elif f in d and f != "name": setattr(u, f, "")
    db.session.commit(); return jsonify(u.pub(True))

@app.post("/api/profile/password")
@login_required
def change_pw():
    d, u = request.get_json(silent=True) or {}, me()
    if not check_password_hash(u.pw_hash, d.get("current") or ""): return err("Current password is incorrect", 403)
    if len(d.get("new") or "") < 8: return err("New password must be 8+ characters")
    u.pw_hash = generate_password_hash(d["new"]); db.session.commit(); return jsonify(ok=True)

# ---------- users ----------
@app.get("/api/users")
@login_required
def users():
    q = User.query.filter(User.role != "admin")
    for f in ("role", "department", "institution"):
        if request.args.get(f): q = q.filter(getattr(User, f) == request.args[f])
    for f in ("skills", "domains", "interests"):
        if request.args.get(f): q = q.filter(getattr(User, f).ilike(f"%{request.args[f]}%"))
    s = request.args.get("q")
    if s: q = q.filter(or_(*[getattr(User, f).ilike(f"%{s}%") for f in ("name", "bio", "skills", "interests", "domains")]))
    p = q.order_by(User.name).paginate(page=int(request.args.get("page", 1)), per_page=20, error_out=False)
    return jsonify(items=[u.pub() for u in p.items], total=p.total)

@app.get("/api/users/<int:uid>")
@login_required
def user_detail(uid):
    u = db.get_or_404(User, uid)
    return jsonify(user=u.pub(), projects=[p.pub() for p in Project.query.filter_by(owner_id=uid, status="published")])

# ---------- projects ----------
def apply_project(p, d):
    for f in ("title", "summary"): 
        if clean(d.get(f)): setattr(p, f, clean(d[f], 500))
    for f in ("description", "domains", "skills", "institution", "department"):
        if f in d: setattr(p, f, clean(d[f]))
    if d.get("collab_type") in MODES: p.collab_type = d["collab_type"]
    if d.get("team_size"): p.team_size = max(1, min(50, int(d["team_size"])))
    if d.get("deadline"): p.deadline = date.fromisoformat(d["deadline"])
    if d.get("status") in ("draft", "published", "in_progress", "completed"): p.status = d["status"]

def validate_published(p):
    if not (p.title and p.summary and p.description and p.domains and p.skills and p.collab_type):
        return "Published projects need title, summary, description, domains, skills and collaboration type"

@app.post("/api/projects")
@login_required
def create_project():
    d = request.get_json(silent=True) or {}
    if d.get("collab_type") not in MODES: return err("collab_type must be one of inter, intra, domain, industry")
    u = me(); p = Project(owner_id=u.id, title="", summary="", collab_type=d["collab_type"],
                          institution=u.institution, department=u.department)
    try: apply_project(p, d)
    except (ValueError, TypeError): return err("Invalid date or number field")
    if not p.title: return err("Title is required")
    if p.status != "draft" and (e := validate_published(p)): return err(e)
    db.session.add(p); db.session.flush(); db.session.add(Member(project_id=p.id, user_id=u.id)); db.session.commit()
    return jsonify(p.pub()), 201

@app.get("/api/projects")
@login_required
def list_projects():
    u = me(); q = Project.query.filter(Project.status.in_(["published", "in_progress"]))
    mode = request.args.get("mode")
    if mode == "inter": q = q.filter(Project.institution == u.institution, Project.department != u.department)
    elif mode == "intra": q = q.filter(Project.department == u.department)
    elif mode in ("domain", "industry"): q = q.filter(Project.collab_type == mode)
    for f in ("status", "department", "institution", "collab_type"):
        if request.args.get(f): q = q.filter(getattr(Project, f) == request.args[f])
    for f in ("skills", "domains"):
        if request.args.get(f): q = q.filter(getattr(Project, f).ilike(f"%{request.args[f]}%"))
    s = request.args.get("q")
    if s: q = q.filter(or_(Project.title.ilike(f"%{s}%"), Project.summary.ilike(f"%{s}%"), Project.domains.ilike(f"%{s}%")))
    p = q.order_by(Project.created.desc()).paginate(page=int(request.args.get("page", 1)), per_page=20, error_out=False)
    return jsonify(items=[x.pub() for x in p.items], total=p.total)

@app.get("/api/projects/mine")
@login_required
def my_projects():
    u = me(); ids = [m.project_id for m in Member.query.filter_by(user_id=u.id)]
    ps = Project.query.filter(or_(Project.owner_id == u.id, Project.id.in_(ids))).order_by(Project.created.desc())
    pend = Req.query.filter_by(sender_id=u.id, kind="join", status="pending")
    return jsonify(projects=[p.pub() for p in ps], pending_join_requests=[r.pub() for r in pend])

def can_see(p, u): return p.status in ("published", "in_progress", "completed") or p.owner_id == u.id or u.role == "admin"

@app.get("/api/projects/<int:pid>")
@login_required
def project_detail(pid):
    p = db.get_or_404(Project, pid)
    if not can_see(p, me()): return err("Not found", 404)
    return jsonify(p.pub())

@app.put("/api/projects/<int:pid>")
@login_required
def edit_project(pid):
    p, u = db.get_or_404(Project, pid), me()
    if p.owner_id != u.id and u.role != "admin": return err("Only the owner can edit this project", 403)
    try: apply_project(p, request.get_json(silent=True) or {})
    except (ValueError, TypeError): return err("Invalid date or number field")
    if p.status != "draft" and (e := validate_published(p)): db.session.rollback(); return err(e)
    db.session.commit(); return jsonify(p.pub())

@app.post("/api/projects/<int:pid>/archive")
@login_required
def archive(pid):
    p, u = db.get_or_404(Project, pid), me()
    if p.owner_id != u.id and u.role != "admin": return err("Only the owner can archive this project", 403)
    p.status = "archived"; db.session.commit(); return jsonify(p.pub())

@app.get("/api/projects/<int:pid>/recommendations")
@login_required
def recommend(pid):
    p, u = db.get_or_404(Project, pid), me()
    if p.owner_id != u.id and u.role != "admin": return err("Only the owner can view recommendations", 403)
    member_ids = {m.user_id for m in Member.query.filter_by(project_id=pid)}
    cands = [c for c in User.query.filter(User.role != "admin") if c.id not in member_ids]
    pd = {k: getattr(p, k) for k in "title summary description domains skills".split()}
    ranked = matching.rank(pd, [c.pub() for c in cands])[:10]
    by = {c.id: c for c in cands}
    return jsonify([{**r, "user": by[r["user_id"]].pub()} for r in ranked])

# ---------- requests ----------
def one_pending(**kw): return Req.query.filter_by(status="pending", **kw).first()

@app.post("/api/requests")
@login_required
def send_request():
    d, u = request.get_json(silent=True) or {}, me()
    kind, msg = d.get("kind"), clean(d.get("message"), 1000)
    if kind not in ("collab", "join", "invite"): return err("Invalid request kind")
    if not msg: return err("Please include a message")
    pid = d.get("project_id")
    if kind == "collab":
        rid = d.get("recipient_id"); pid = None
        if rid == u.id or not db.session.get(User, rid or 0): return err("Invalid recipient")
    else:
        p = db.get_or_404(Project, pid or 0)
        if kind == "join":
            if p.status not in ("published", "in_progress"): return err("Project is not open to join")
            rid = p.owner_id
            if Member.query.filter_by(project_id=pid, user_id=u.id).first(): return err("You are already a member", 409)
        else:
            if p.owner_id != u.id: return err("Only the owner can invite", 403)
            rid = d.get("recipient_id")
            if not db.session.get(User, rid or 0) or Member.query.filter_by(project_id=pid, user_id=rid).first(): return err("Invalid invitee")
    if one_pending(kind=kind, sender_id=u.id, recipient_id=rid, project_id=pid): return err("A pending request already exists", 409)
    r = Req(kind=kind, sender_id=u.id, recipient_id=rid, project_id=pid, message=msg)
    db.session.add(r); notify(rid, f"New {kind} request from {u.name}"); db.session.commit()
    return jsonify(r.pub()), 201

@app.get("/api/requests")
@login_required
def my_requests():
    u = me()
    rec = Req.query.filter_by(recipient_id=u.id).order_by(Req.created.desc())
    sent = Req.query.filter_by(sender_id=u.id).order_by(Req.created.desc())
    return jsonify(received=[r.pub() for r in rec], sent=[r.pub() for r in sent])

@app.post("/api/requests/<int:rid>/respond")
@login_required
def respond(rid):
    r, u = db.get_or_404(Req, rid), me()
    action = (request.get_json(silent=True) or {}).get("action")
    if r.status != "pending": return err("Request already resolved", 409)
    if action == "cancel":
        if r.sender_id != u.id: return err("Forbidden", 403)
        r.status = "cancelled"
    elif action in ("accept", "decline"):
        if r.recipient_id != u.id: return err("Forbidden", 403)      # server-side permission check
        r.status = "accepted" if action == "accept" else "declined"
        if r.status == "accepted" and r.kind in ("join", "invite"):
            joiner = r.sender_id if r.kind == "join" else r.recipient_id
            if not Member.query.filter_by(project_id=r.project_id, user_id=joiner).first():
                db.session.add(Member(project_id=r.project_id, user_id=joiner))
        notify(r.sender_id, f"{u.name} {r.status} your {r.kind} request")
    else: return err("action must be accept, decline or cancel")
    db.session.commit(); return jsonify(r.pub())

# ---------- messaging / notifications ----------
@app.post("/api/messages")
@login_required
def send_message():
    d, u = request.get_json(silent=True) or {}, me()
    rid, body = d.get("recipient_id"), clean(d.get("body"), 4000)
    if not body or rid == u.id or not db.session.get(User, rid or 0): return err("Invalid message")
    db.session.add(Message(sender_id=u.id, recipient_id=rid, body=body)); notify(rid, f"New message from {u.name}")
    db.session.commit(); return jsonify(ok=True), 201

@app.get("/api/messages/<int:other>")
@login_required
def thread(other):      # only returns messages where the caller is a participant
    u = me()
    q = Message.query.filter(or_((Message.sender_id == u.id) & (Message.recipient_id == other),
                                 (Message.sender_id == other) & (Message.recipient_id == u.id))).order_by(Message.created)
    msgs = q.all()
    for m in msgs:
        if m.recipient_id == u.id: m.read = True
    db.session.commit()
    return jsonify([{"id": m.id, "from": m.sender_id, "body": m.body, "created": m.created.isoformat()} for m in msgs])

@app.get("/api/messages")
@login_required
def conversations():
    u = me(); seen = {}
    for m in Message.query.filter(or_(Message.sender_id == u.id, Message.recipient_id == u.id)).order_by(Message.created.desc()):
        o = m.recipient_id if m.sender_id == u.id else m.sender_id
        c = seen.setdefault(o, {"user": db.session.get(User, o).pub(), "last": m.body, "at": m.created.isoformat(), "unread": 0})
        if m.recipient_id == u.id and not m.read: c["unread"] += 1
    return jsonify(list(seen.values()))

@app.get("/api/notifications")
@login_required
def notifications():
    ns = Notification.query.filter_by(user_id=me().id).order_by(Notification.created.desc()).limit(50)
    return jsonify([{"id": n.id, "text": n.text, "read": n.read, "created": n.created.isoformat()} for n in ns])

# ---------- opportunities ----------
@app.get("/api/opportunities")
@login_required
def opportunities():
    q = Opportunity.query
    if request.args.get("category"): q = q.filter_by(category=request.args["category"])
    if request.args.get("q"): q = q.filter(Opportunity.title.ilike(f"%{request.args['q']}%"))
    saved = {s.opp_id for s in Saved.query.filter_by(user_id=me().id)}
    return jsonify([{"id": o.id, "title": o.title, "category": o.category, "description": o.description,
                     "deadline": o.deadline.isoformat() if o.deadline else None, "url": o.url or None,
                     "demo": o.is_demo, "saved": o.id in saved} for o in q.order_by(Opportunity.deadline)])

@app.post("/api/opportunities/<int:oid>/save")
@login_required
def save_opp(oid):
    db.get_or_404(Opportunity, oid)
    if not Saved.query.filter_by(user_id=me().id, opp_id=oid).first(): db.session.add(Saved(user_id=me().id, opp_id=oid)); db.session.commit()
    return jsonify(saved=True)

@app.delete("/api/opportunities/<int:oid>/save")
@login_required
def unsave_opp(oid):
    Saved.query.filter_by(user_id=me().id, opp_id=oid).delete(); db.session.commit(); return jsonify(saved=False)

# ---------- dashboard / admin ----------
@app.get("/api/dashboard")
@login_required
def dashboard():
    u = me()
    return jsonify(
        active_projects=Member.query.join(Project).filter(Member.user_id == u.id, Project.status.in_(["published", "in_progress"])).count(),
        collaborators=Req.query.filter(Req.status == "accepted", or_(Req.sender_id == u.id, Req.recipient_id == u.id)).count(),
        pending_requests=Req.query.filter_by(recipient_id=u.id, status="pending").count(),
        saved_opportunities=Saved.query.filter_by(user_id=u.id).count())

@app.get("/api/admin/stats")
@admin_required
def admin_stats():
    return jsonify(users=User.query.count(), projects=Project.query.count(), requests=Req.query.count(), messages=Message.query.count())

@app.get("/api/admin/users")
@admin_required
def admin_users(): return jsonify([u.pub(True) for u in User.query.order_by(User.created.desc())])

@app.delete("/api/admin/projects/<int:pid>")
@admin_required
def admin_remove_project(pid):
    p = db.get_or_404(Project, pid); p.status = "archived"; db.session.commit()   # soft-delete keeps references intact
    return jsonify(p.pub())

# ---------- CLI: flask --app app init-db | seed ----------
@app.cli.command("init-db")
def init_db(): db.create_all(); print("Database ready")

@app.cli.command("seed")

def seed():
    """Add demo projects and opportunities without deleting existing users."""
    db.create_all()

    pw = generate_password_hash("DemoPass123!")

    def U(n, e, r, dept, sk, it, dm, bio, inst="Demo University"):
        u = User.query.filter_by(email=e).first()
        if not u:
            u = User(
                name=n, email=e, pw_hash=pw, role=r,
                institution=inst, department=dept,
                skills=sk, interests=it, domains=dm, bio=bio,
                is_demo=True
            )
            db.session.add(u)
            db.session.flush()
        return u

    a = U("Asha Rao (demo)", "asha@demo.nexora", "student",
          "Computer Engineering", "python, machine learning, data analysis",
          "predictive maintenance, time series", "ai, industrial iot",
          "Student exploring ML for machines.")
    b = U("Dr. Vikram Shah (demo)", "vikram@demo.nexora", "faculty",
          "Mechanical Engineering", "vibration analysis, sensors, cad",
          "predictive maintenance, rotating machinery", "manufacturing, industrial iot",
          "Researcher in machine health monitoring.")
    c = U("Meera Iyer (demo)", "meera@demo.nexora", "student",
          "Environmental Science", "iot sensors, environmental data analysis, gis",
          "air pollution monitoring", "environment, iot",
          "Works on urban air quality.")
    d = U("Dr. Lena Fox (demo)", "lena@demo.nexora", "faculty",
          "Medicine", "radiology, clinical research",
          "medical imaging, diagnostics", "healthcare, ai",
          "Clinician-researcher in imaging.")
    co = U("Fictional Co: Orbitek Systems (demo)", "orbitek@demo.nexora",
           "company", "", "embedded systems", "industrial automation",
           "manufacturing", "Fictional company for demo purposes only.",
           "Orbitek (fictional)")

    def P(o, t, s, ds, dm, sk, mode, dept, st="published"):
        p = Project.query.filter_by(title=t).first()
        if not p:
            p = Project(
                owner_id=o.id, title=t, summary=s, description=ds,
                domains=dm, skills=sk, collab_type=mode,
                institution=o.institution, department=dept, status=st
            )
            db.session.add(p)
            db.session.flush()
            db.session.add(Member(project_id=p.id, user_id=o.id))
        return p

    p1 = P(a, "Predictive Maintenance for Industrial Motors",
           "ML on vibration data to predict failures.",
           "Time series models over motor vibration data to forecast failures.",
           "ai, industrial iot, manufacturing",
           "machine learning, vibration analysis, sensors",
           "inter", "Computer Engineering")

    P(c, "Urban Air Pollution Sensor Network",
      "Low-cost IoT sensors for neighbourhood air quality.",
      "Deploy and analyse environmental sensor data across the city.",
      "environment, iot",
      "iot sensors, environmental data analysis, python",
      "domain", "Environmental Science")

    P(d, "AI-assisted Medical Image Analysis",
      "Cross-disciplinary imaging diagnosis support.",
      "Deep learning for radiology triage with clinician input.",
      "healthcare, ai", "machine learning, radiology, python",
      "domain", "Medicine")

    P(co, "Sponsored Challenge: Line Fault Detection (demo)",
      "Fictional company problem statement.",
      "Detect faults on a packaging line from sensor streams.",
      "manufacturing, ai", "embedded systems, machine learning",
      "industry", "")

    P(a, "Student ML Reading Group Project (draft)",
      "Intra-department team.", "", "ai", "python",
      "intra", "Computer Engineering", "draft")

    if not Req.query.filter_by(
        sender_id=b.id, recipient_id=a.id, project_id=p1.id
    ).first():
        db.session.add(Req(
            kind="join", sender_id=b.id, recipient_id=a.id,
            project_id=p1.id,
            message="My vibration-analysis lab can supply data."
        ))
        notify(a.id, "New join request from Dr. Vikram Shah (demo)")

    if not Message.query.filter_by(
        sender_id=b.id, recipient_id=a.id
    ).first():
        db.session.add(Message(
            sender_id=b.id, recipient_id=a.id,
            body="Hi Asha, happy to share sample datasets."
        ))

    opportunities = [
        ("Demo Research Grant (fictional)", "grant", date(2027, 1, 31)),
        ("Demo AI Conference Call for Papers (fictional)", "conference", date(2026, 12, 15)),
        ("Demo Summer Internship (fictional)", "internship", date(2027, 3, 1)),
    ]

    for title, category, deadline in opportunities:
        if not Opportunity.query.filter_by(title=title).first():
            db.session.add(Opportunity(
                title=title, category=category, deadline=deadline,
                description="Demo content, not a real opportunity.", url=""
            ))

    db.session.commit()
    print("Demo data added successfully!")
    print("Demo login: asha@demo.nexora / DemoPass123!")


if __name__ == "__main__":
    with app.app_context(): db.create_all()
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", port=5000)
