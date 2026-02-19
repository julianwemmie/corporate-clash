# Multiplayer

## Status: Todo

## Description

Convert the game from single-player to multiplayer so users can build their own corporations and attack each other. Attacks are asynchronous (no real-time combat).

## High-Level Steps

1. **Backend & Database** — Stand up a server (Node/Express or Hono) with PostgreSQL. Define tables for players, buildings, employees, and attack logs.
2. **Auth** — User registration and login with JWT or sessions.
3. **Server-Authoritative Game State** — All mutations (build, hire, attack) go through the server. Client becomes a view layer. Funds use compute-on-read (store last snapshot + timestamp, derive current funds from employee profit rates).
4. **Client Networking Layer** — Replace direct world mutations with API calls. Fetch game state on load, send actions as HTTP POSTs.
5. **PvP Attacks** — "Browse targets" UI to see other players. Attack endpoint runs damage calc server-side against the target's current state. Results stored in attack log.
6. **Attack Polling** — Client polls for incoming attacks every ~15 seconds. Show damage alert when a new attack is found. Can upgrade to WebSockets later for instant push.
7. **Remove Single-Player AI Attacks** — Replace the local AttackManager timer with the server-driven PvP attack system.
