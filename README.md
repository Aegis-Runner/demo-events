# Atlas Events

A fictional demo application used as an AegisRunner testing target (no third-party IP).

## What it exercises

```
ATLAS EVENTS — RSVPs against a CAPACITY INVARIANT.
  INVARIANT   remaining = capacity − confirmed RSVPs, and must never go negative.
  FILTER      "Available" lists a SUBSET (remaining > 0). A full event leaking in
              is a filter-soundness bug.
  PERSISTENCE an RSVP must survive an independent re-read and move the count.
Faults (healthy when DEMO_BUGS empty):
  overbook       RSVP is accepted past capacity (remaining goes negative)
  ghostrsvp      RSVP "confirmed" but never recorded
  leakyavailable the Available filter also shows full events
```

## Run

```sh
docker build -t demo-events .
docker run -p 3000:3000 -e DEMO_RESET_TOKEN=changeme demo-events
```

Fault injection is env-gated via `DEMO_BUGS` (comma-separated); healthy when empty. Reset via `POST /api/reset` with header `X-Reset-Token`.
