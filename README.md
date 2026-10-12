# NEXORA — Where Ideas Connect, Innovation Begins.
Research & Collaboration Network. Flask backend + React/Vite/Tailwind frontend.

## Setup
```bash
cd nexora/backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env                              # edit SECRET_KEY, ADMIN_PASSWORD
flask --app app init-db
flask --app app seed        # demo users (password DemoPass123!, demo only) + admin if ADMIN_PASSWORD set
python app.py               # http://localhost:5000
```
Reset demo data: delete `instance/nexora.db`, then re-run init-db and seed. Never seed demo accounts in production.

## Run the frontend (second terminal)
```bash
cd nexora/frontend
npm install
cp .env.example .env     # leave VITE_API_URL empty to use the dev proxy to :5000
npm run dev              # http://localhost:5173
npm run build            # production build check
```
Start the backend first. Log in with `asha@demo.nexora` / `DemoPass123!` after seeding.

## API (session cookie auth)
auth: `POST /api/auth/register|login|logout`, `GET /api/auth/me` · profile: `PUT /api/profile`, `POST /api/profile/password`
users: `GET /api/users?q=&role=&department=&skills=` · projects: `GET/POST /api/projects?mode=inter|intra|domain|industry`,
`GET/PUT /api/projects/<id>`, `POST /api/projects/<id>/archive`, `GET /api/projects/mine`, `GET /api/projects/<id>/recommendations`
requests: `POST /api/requests {kind: collab|join|invite}`, `GET /api/requests`, `POST /api/requests/<id>/respond {action}`
messages: `GET/POST /api/messages`, `GET /api/messages/<user_id>` · `GET /api/notifications` · opportunities + save/unsave · `GET /api/dashboard` · `/api/admin/*` (admin only)

## Matching
`matching.py`: pure-Python TF-IDF cosine + skill coverage + domain overlap, weighted 40/30/20/10 (configurable heuristics, not tuned).
It is not a trained model. No labelled evaluation set is included, so no Precision@K is reported.

## Limitations
- Frontend untested: it has not been built or run against the backend. Expect small compile/runtime fixes.
- No charts; admin has no user-management actions or reports; one-to-one chat polls every 10s (no websockets).
- Invitations/join requests share the requests tab filters; no company-specific proposal workflow beyond project type `industry`.
- No automated tests or migrations (uses `create_all`); no email/SMTP; no CSRF tokens (SameSite=Lax cookie only); no rate limiting.
- Skills/domains/interests are comma-separated text columns, not normalized tables.
- Demo opportunities have no URLs and are labelled fictional.
- Deployment: run behind gunicorn with a real SECRET_KEY, HTTPS, and Postgres via DATABASE_URL.
