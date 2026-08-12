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
const STYLE = `body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f4f8f6;color:#16241d}header{background:#12503a;color:#fff;padding:12px 20px;display:flex;gap:18px;align-items:center}header a{color:#c9e8db;text-decoration:none;font-weight:500}header a.on{color:#fff;text-decoration:underline}main{max-width:900px;margin:22px auto;padding:0 16px}.card{background:#fff;border:1px solid #dbe6e0;border-radius:8px;padding:18px;margin-bottom:18px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e9f0ec}th{font-size:12px;text-transform:uppercase;color:#5b7c6d}label{display:block;margin:10px 0 4px;font-size:13px;color:#416052}input{padding:8px 10px;border:1px solid #c9dbd2;border-radius:6px;min-width:230px;font-size:14px}button,.btn{background:#12503a;color:#fff;border:0;border-radius:6px;padding:9px 16px;font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}.pill{display:inline-block;padding:2px 9px;border-radius:12px;font-size:12px;background:#e6efe9}.pill.full{background:#fdecea;color:#8a1c10}.muted{color:#6b7a89;font-size:13px}.err{background:#fdecea;border:1px solid #f5b3ab;color:#8a1c10;padding:9px 12px;border-radius:6px;margin-bottom:12px}.tot{font-size:20px;font-weight:600}`;
const layout = (a, t, b) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t)} · Atlas Events</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${STYLE}</style></head><body><header><strong>Atlas Events</strong>${[["/", "Dashboard"], ["/events", "Events"], ["/events?filter=available", "Available"]].map(([h, l]) => `<a href="${h}" class="${a === h ? "on" : ""}">${l}</a>`).join("")}<span style="margin-left:auto"><a href="/logout">Sign out</a></span></header><main><h1>${esc(t)}</h1>${b}</main></body></html>`;
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
    `<div class="card"><table><tr><th>Event</th><th>When</th><th>Capacity</th><th>Confirmed</th><th>Remaining</th></tr>${rows.map(e => { const r = remaining(e); return `<tr><td><a href="/events/${e.id}">${esc(e.name)}</a></td><td>${esc(e.when)}</td><td>${e.capacity}</td><td>${confirmed(e)}</td><td>${r <= 0 ? `<span class="pill full">full</span>` : `<span class="pill">${r}</span>`}</td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">None.</td></tr>`}</table></div>`));
});
app.get("/events/:id", (req, res) => {
  const e = events.find(x => x.id === req.params.id);
  if (!e) return res.status(404).send(layout("/events", "Not found", `<div class="card">No such event.</div>`));
  const list = rsvps.filter(r => r.eventId === e.id);
  const r = remaining(e);
  res.send(layout("/events", e.name, `<div class="card"><table><tr><th>When</th><td>${esc(e.when)}</td></tr><tr><th>Capacity</th><td>${e.capacity}</td></tr><tr><th>Remaining</th><td class="tot">${r}${r <= 0 ? ` <span class="pill full">full</span>` : ""}</td></tr></table></div>
<div class="card"><h3>RSVP</h3><form method="post" action="/events/${e.id}/rsvp"><label for="name">Attendee name</label><input id="name" name="name" value="New Attendee"><p><button>Confirm RSVP</button></p></form></div>
<div class="card"><h3>Confirmed attendees</h3><table><tr><th>Ref</th><th>Name</th></tr>${list.map(x => `<tr><td>R${esc(x.id)}</td><td>${esc(x.name)}</td></tr>`).join("") || `<tr><td colspan="2" class="muted">None yet.</td></tr>`}</table></div>`));
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
