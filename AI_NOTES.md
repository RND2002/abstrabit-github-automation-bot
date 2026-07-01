# AI Notes

## AI Tools & Models Used

- **Gemini (via Antigravity IDE)** — Used as the primary coding assistant for architecture planning, debugging, code reviews, and implementing features.
- **DeepSeek Chat (via OpenRouter)** — Used in-app as the AI triage engine that auto-summarizes issues/PRs, suggests labels, and assigns priority.

### Work Split

The bulk of the architecture decisions (tech stack, data model, module structure) were mine. AI was used heavily for:
- Scaffolding boilerplate (Express routes, Prisma schema, Zod schemas)
- Debugging TypeScript type errors across the Prisma ↔ controller boundary
- Writing the webhook signature verification and encryption utilities
- Reviewing code for security and production-readiness

I made all integration decisions (which services to use, how to wire them) and designed the rule engine's condition matching and template interpolation system.

---

## Key Decisions I Made

1. **Controller → Service → Repository layering** — I chose a clean three-layer architecture instead of putting everything in controllers. This keeps business logic testable and the data layer swappable. The AI suggested putting Prisma calls directly in controllers initially, but I insisted on the repository pattern.

2. **Encrypted token storage with AES-256-GCM** — Rather than storing GitHub access tokens as plaintext in the database, I decided to encrypt them at rest. This was my call — the AI initially suggested just storing them directly. I used AES-256-GCM with random IVs for authenticated encryption.

3. **Fire-and-forget webhook processing with DB-backed status** — I chose to respond 200 to GitHub immediately and process rules asynchronously, but with every event persisted to the database with a status (PENDING → PROCESSED/FAILED/IGNORED). This means no events are lost even if processing fails, and the dashboard always has a complete audit trail. AI suggested a simpler synchronous approach.

---

## Hardest Bug / Wrong Turn

The single hardest issue was **the Prisma schema ↔ database migration mismatch**. When I added AI triage fields (`aiSummary`, `aiPriority`, `aiSuggestedLabel`) to the Prisma schema, I ran `prisma generate` locally but forgot to run `prisma migrate deploy` on the production database. The app deployed fine (the build passed because TypeScript only checks types, not DB state), but every request to `/api/event/global` crashed with:

```
The column `Event.aiSummary` does not exist in the current database.
```

This was particularly tricky because:
- The error only appeared in production logs, not locally (my local DB had the migration)
- The error middleware was swallowing the original Prisma error details — I could only see "Internal Server Error" in the response
- The AI initially suggested the columns might need different names, when the real issue was simply that the migration hadn't been applied

**How I fixed it:** I improved the error middleware to preserve and log the original error object (including Prisma's `code` and `meta` properties), then ran `prisma migrate deploy` against the production database.

---

## What I'd Improve With More Time

- **Replace `Function` constructor with a proper expression evaluator** — Currently rule conditions use `new Function()` which is safer than `vm.runInContext` but still not ideal. I'd use a library like `jsonata` or build a structured predicate matcher.
- **GitHub App authentication** — Currently using plain OAuth tokens. A GitHub App with JWT + installation tokens would be more robust and wouldn't be tied to a user session.
- **WebSocket-based live dashboard** — Currently the dashboard polls. WebSocket push would give true real-time updates.
- **Rate limiting** — Add rate limiting middleware to prevent abuse.
- **Comprehensive test suite** — Unit tests for the rule engine, integration tests for the webhook flow.
- **Store GitHub webhook hook ID** — So we can properly clean up webhooks when a repo is disconnected.
