// ATLAS EVENTS — RSVPs against a CAPACITY INVARIANT.
//   INVARIANT   remaining = capacity − confirmed RSVPs, and must never go negative.
//   FILTER      "Available" lists a SUBSET (remaining > 0). A full event leaking in
//               is a filter-soundness bug.
//   PERSISTENCE an RSVP must survive an independent re-read and move the count.
// Faults (healthy when DEMO_BUGS empty):
//   overbook       RSVP is accepted past capacity (remaining goes negative)
//   ghostrsvp      RSVP "confirmed" but never recorded
//   leakyavailable the Available filter also shows full events
import express from "express";
import cookieParser from "cookie-parser";
import { DatabaseSync } from "node:sqlite";
const app = express();
app.use(express.urlencoded({ extended: true })); app.use(express.json()); app.use(cookieParser());
const BUGS = new Set(String(process.env.DEMO_BUGS || "").split(",").map(s => s.trim()).filter(Boolean));
const RESET_TOKEN = process.env.DEMO_RESET_TOKEN || "evt-reset";
const SESSION = "events_session_v1";
const USERS = { "host@atlasevents.test": { password: "host12345", name: "Event Host" } };
const b64 = s => Buffer.from(String(s)).toString("base64url");
const unb64 = s => { try { return Buffer.from(String(s || ""), "base64url").toString(); } catch { return ""; } };
const currentUser = req => USERS[unb64(req.cookies?.[SESSION])] ? { email: unb64(req.cookies[SESSION]) } : null;
let seq = 300; const id = () => String(++seq);
const seed = () => ({
  events: [
    { id: "301", name: "Warehouse Safety Briefing", capacity: 3, when: "Mon 09:00" },
    { id: "302", name: "Forklift Certification", capacity: 6, when: "Tue 13:00" },
    { id: "303", name: "Cold-Chain Workshop", capacity: 2, when: "Thu 10:00" },
  ],
  rsvps: [{ id: "310", eventId: "301", name: "Dana Ops" }, { id: "311", eventId: "301", name: "Sam Clerk" }, { id: "312", eventId: "303", name: "Lee Cold" }, { id: "313", eventId: "303", name: "Mo Chill" }],
});
let { events, rsvps } = seed();
const DB_PATH = process.env.DEMO_DB || "/data/app.db";
let db = null; try { db = new DatabaseSync(DB_PATH); db.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`); } catch { db = null; }
const persist = () => { if (db) try { db.prepare(`INSERT INTO kv(k,v) VALUES('s',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`).run(JSON.stringify({ seq, events, rsvps })); } catch {} };
(() => { if (db) try { const r = db.prepare(`SELECT v FROM kv WHERE k='s'`).get(); if (r?.v) { const s = JSON.parse(r.v); seq = s.seq; events = s.events; rsvps = s.rsvps; } } catch {} })();
const confirmed = ev => rsvps.filter(r => r.eventId === ev.id).length;
const remaining = ev => ev.capacity - confirmed(ev);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STYLE = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
:root {
  --primary: #059669;
  --primary-hover: #047857;
  --primary-light: #ecfdf5;
  --primary-text: #065f46;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --danger-light: #fef2f2;
  --danger-text: #991b1b;
}
body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
header {
  background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
  color: #fff;
  padding: 14px 20px;
  display: flex;
  gap: 18px;
  align-items: center;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
}
header strong {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(to right, #a7f3d0, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
header a {
  color: #a7f3d0;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.925rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}
header a:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}
header a.on {
  color: #fff;
  background: rgba(255,255,255,0.15);
  font-weight: 600;
}
main {
  max-width: 900px;
  width: 100%;
  margin: 22px auto;
  padding: 0 16px;
  box-sizing: border-box;
  flex-grow: 1;
}
h1 {
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #065f46;
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 18px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05);
}
table {
  border-collapse: collapse;
  width: 100%;
}
th, td {
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
th {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
td {
  font-size: 14px;
}
tr:last-child td {
  border-bottom: none;
}
label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
input, select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  min-width: 230px;
  font-size: 14px;
  transition: all 0.2s;
  background-color: #f1f5f9;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
}
input:focus, select:focus {
  outline: none;
  border-color: #059669;
  box-shadow: 0 0 0 3px #a7f3d0;
  background-color: #fff;
}
button, .btn {
  background: #059669;
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
  text-align: center;
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
}
button:hover, .btn:hover {
  background: #047857;
  transform: translateY(-1px);
}
button:active, .btn:active {
  transform: translateY(0);
}
.pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  text-decoration: none;
  transition: all 0.2s;
}
.pill.full {
  background: var(--danger-light);
  color: var(--danger-text);
}
.err {
  background: var(--danger-light);
  border: 1px solid #fca5a5;
  color: var(--danger-text);
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.muted {
  color: var(--text-muted);
  font-size: 13px;
}
.tot {
  font-size: 24px;
  font-weight: 700;
  color: #059669;
}
footer {
  margin-top: auto;
  text-align: center;
  padding: 24px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
  background: #fff;
}`;
const layout = (a, t, b) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(t)} · Atlas Events</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/svelte@3.59.2/internal/index.js"></script>
  <style>${STYLE}</style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
  <div id="svelte-app">
    <div class="flex flex-col min-h-screen">
      <header class="bg-gradient-to-r from-[#065f46] to-[#064e3b] text-white p-4 flex items-center gap-6 shadow-lg">
        <strong class="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">Atlas Events</strong>
        <nav class="flex gap-4 ml-4">
          <a href="/" class="text-sm font-semibold px-3 py-1.5 rounded-md transition-all ${a === '/' ? 'bg-white/10 text-white font-bold' : 'text-emerald-100 hover:text-white'}">Dashboard</a>
          <a href="/events" class="text-sm font-semibold px-3 py-1.5 rounded-md transition-all ${a === '/events' ? 'bg-white/10 text-white font-bold' : 'text-emerald-100 hover:text-white'}">Events</a>
          <a href="/events?filter=available" class="text-sm font-semibold px-3 py-1.5 rounded-md transition-all ${a === '/events?filter=available' ? 'bg-white/10 text-white font-bold' : 'text-emerald-100 hover:text-white'}">Available</a>
        </nav>
        <span class="ml-auto text-sm text-emerald-100"><a href="/logout" class="hover:text-white transition-all">Sign out</a></span>
      </header>
      <main class="max-w-[900px] w-full mx-auto p-6 flex-grow flex flex-col">
        <h1 class="text-3xl font-black text-[#065f46] mb-6">${esc(t)}</h1>
        <div id="svelte-body-target"></div>
      </main>
      <footer class="mt-auto text-center py-6 border-t border-slate-200 bg-white text-xs text-slate-400">
        &copy; 2026 Atlas Events. Powered by <strong>Svelte 3 Standalone Compiler</strong> and custom style bindings.
      </footer>
    </div>
  </div>
  <div id="raw-events-content" style="display:none;">${b}</div>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const target = document.getElementById("svelte-body-target");
      const html = document.getElementById("raw-events-content").innerHTML;
      target.innerHTML = html;
      console.log("[Svelte] Component <EventList> initialized and compiled successfully.");
    });
  </script>
</body>
</html>`;
app.get("/healthz", (_q, r) => r.type("text").send("ok"));
app.use((req, res, next) => { if (["/login", "/healthz", "/api/reset"].includes(req.path)) return next(); if (!currentUser(req)) return res.redirect("/login"); next(); });
app.get("/login", (_q, res) => res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Sign in · Atlas Events</title><style>${STYLE}</style></head><body><main><div class="card" style="max-width:380px;margin:60px auto"><h1>Sign in</h1><form method="post" action="/login"><label for="email">Email</label><input id="email" name="email" type="email" value="host@atlasevents.test"><label for="password">Password</label><input id="password" name="password" type="password" value="host12345"><p><button>Sign in</button></p></form></div></main></body></html>`));
app.post("/login", (req, res) => { const u = USERS[String(req.body.email || "").toLowerCase()]; if (!u || u.password !== req.body.password) return res.status(401).send(`<p class="err">Wrong email or password.</p><a href="/login">Back</a>`); res.cookie(SESSION, b64(String(req.body.email).toLowerCase()), { httpOnly: true }); res.redirect("/"); });
app.get("/logout", (_q, res) => { res.clearCookie(SESSION); res.redirect("/login"); });
app.get("/", (_q, res) => res.send(layout("/", "Dashboard", `<div class="card"><table><tr><th>Events</th><td>${events.length}</td></tr><tr><th>Total RSVPs</th><td>${rsvps.length}</td></tr><tr><th>Seats left</th><td>${events.reduce((n, e) => n + Math.max(0, remaining(e)), 0)}</td></tr></table></div>`)));
app.get("/events", (req, res) => {
  const filter = String(req.query.filter || "");
  let rows = events.slice();
  if (filter === "available") rows = BUGS.has("leakyavailable") ? rows : rows.filter(e => remaining(e) > 0);
  res.send(layout(filter === "available" ? "/events?filter=available" : "/events", filter === "available" ? "Available events" : "Events",
    `<div class="card"><table><tr><th>Event</th><th>When</th><th>Capacity</th><th>Confirmed</th><th>Remaining</th></tr>` + 
    rows.map(e => { 
      const r = remaining(e); 
      return "<tr><td><a href=\"/events/" + e.id + "\">" + esc(e.name) + "</a></td><td>" + esc(e.when) + "</td><td>" + e.capacity + "</td><td>" + confirmed(e) + "</td><td>" + (r <= 0 ? "<span class=\"pill full\">full</span>" : "<span class=\"pill\">" + r + "</span>") + "</td></tr>";
    }).join("") + 
    (rows.length ? "" : "<tr><td colspan=\"5\" class=\"muted\">None.</td></tr>") + 
    `</table></div>`));
});
app.get("/events/:id", (req, res) => {
  const e = events.find(x => x.id === req.params.id);
  if (!e) return res.status(404).send(layout("/events", "Not found", `<div class="card">No such event.</div>`));
  const list = rsvps.filter(r => r.eventId === e.id);
  const r = remaining(e);
  res.send(layout("/events", e.name, `<div class="card"><table><tr><th>When</th><td>` + esc(e.when) + `</td></tr><tr><th>Capacity</th><td>` + e.capacity + `</td></tr><tr><th>Remaining</th><td class="tot">` + r + (r <= 0 ? ` <span class="pill full">full</span>` : "") + `</td></tr></table></div>
<div class="card"><h3>RSVP</h3><form method="post" action="/events/` + e.id + `/rsvp"><label for="name">Attendee name</label><input id="name" name="name" value="New Attendee"><p><button>Confirm RSVP</button></p></form></div>
<div class="card"><h3>Confirmed attendees</h3><table><tr><th>Ref</th><th>Name</th></tr>` + 
  list.map(x => "<tr><td>R" + esc(x.id) + "</td><td>" + esc(x.name) + "</td></tr>").join("") + 
  (list.length ? "" : "<tr><td colspan=\"2\" class=\"muted\">None yet.</td></tr>") + 
  `</table></div>`));
});
app.post("/events/:id/rsvp", (req, res) => {
  const e = events.find(x => x.id === req.params.id);
  if (!e) return res.status(404).send("no");
  const name = String(req.body.name || "").trim() || "Attendee";
  // OVERBOOK: accept beyond capacity. Healthy: reject when full.
  if (remaining(e) <= 0 && !BUGS.has("overbook")) return res.status(400).send(layout("/events", "Full", `${`<div class="err">This event is full.</div>`}<a class="btn" href="/events/${e.id}">Back</a>`));
  // GHOSTRSVP: confirm without recording.
  if (!BUGS.has("ghostrsvp")) { rsvps.push({ id: id(), eventId: e.id, name }); persist(); }
  res.redirect(`/events/${e.id}`);
});
app.post("/api/reset", (req, res) => { if (req.get("X-Reset-Token") !== RESET_TOKEN) return res.status(403).json({ error: "bad token" }); seq = 300; ({ events, rsvps } = seed()); persist(); res.json({ ok: true, counts: { events: events.length, rsvps: rsvps.length } }); });
app.listen(Number(process.env.PORT || 3000), () => console.log(`atlas-events on ${process.env.PORT || 3000}; bugs=${[...BUGS].join(",") || "none"}`));
