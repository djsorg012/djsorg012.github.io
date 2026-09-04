# Dana Tutoring Booking Website Implementation Plan

> **Static deployment revision (approved September 4, 2026):** The implementation target changed to GitHub Pages. The delivered implementation therefore uses Vite static output, device-local `localStorage` booking state, EmailJS, GitHub Actions Pages deployment, and browser verification. D1, server routes, Resend, and Sites deployment tasks in the original plan are superseded by this revision.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy Dana’s mobile-first tutor discovery and booking website with persistent slot reservations, Resend transactional email, privacy-safe PostHog analytics, and a synthetic traffic simulator.

**Architecture:** A Vinext/React Sites app renders a single-page tutor discovery flow and a client-side booking sheet. Fixed tutor schedules live in typed source data; Cloudflare D1 stores reservations behind server routes with a unique tutor/time constraint. A narrow analytics adapter owns all PostHog calls, while a narrow mail adapter owns Resend delivery so both can be tested without leaking personal data.

**Tech Stack:** OpenAI Sites Vinext starter, React, TypeScript, Tailwind CSS, Shadcn UI, Cloudflare Workers, D1/SQLite, Vitest, Testing Library, PostHog JavaScript SDK, Resend HTTP API

**Spec:** `docs/superpowers/specs/2026-09-04-dana-tutoring-booking-design.md`

## Global Constraints

- Keep the primary journey on one page; do not add accounts, payments, tutor administration, SMS, cancellation, rescheduling, or a matching algorithm.
- Store only completed bookings; calculate availability from fixed tutor schedules minus reservations.
- Enforce one booking per tutor/time with a database uniqueness constraint.
- Never send parent names, parent emails, student names, free text, booking IDs, or raw errors to PostHog.
- Mark every simulated analytics event with `traffic_type: "synthetic"`.
- Keep all form controls keyboard accessible, WCAG AA, touch-friendly, and usable in a full-screen mobile sheet.
- Keep Resend and hosted configuration out of tracked source; email failure must not undo a confirmed booking.
- Use Cloudflare Worker-compatible ESM output and keep the runtime within the 128 MB isolate limit.

---

## File Map

- `app/page.tsx` — assembles the single-page experience.
- `app/layout.tsx` — site metadata, fonts, and PostHog provider.
- `app/globals.css` — theme tokens, responsive layout, focus, and motion rules.
- `app/api/availability/route.ts` — returns open slots for one tutor.
- `app/api/bookings/route.ts` — validates and reserves a booking, sends mail, and returns delivery status.
- `app/components/tutor-explorer.tsx` — filters, tutor results, active tutor state, and booking-sheet orchestration.
- `app/components/tutor-card.tsx` — accessible profile summary and primary action.
- `app/components/booking-sheet.tsx` — slot, details, review, submission, conflict, and success states.
- `app/components/posthog-provider.tsx` — browser-only PostHog initialization.
- `app/data/tutors.ts` — typed tutor catalog and recurring schedule.
- `app/lib/analytics.ts` — typed, privacy-safe analytics event facade.
- `app/lib/availability.ts` — deterministic future-slot generation and subtraction.
- `app/lib/booking-schema.ts` — booking input validation and normalized types.
- `app/lib/bookings.server.ts` — D1 repository and atomic reservation contract.
- `app/lib/email.server.ts` — Resend request construction and delivery results.
- `app/lib/env.server.ts` — validated server configuration.
- `migrations/0001_create_bookings.sql` — booking table and unique tutor/slot rule.
- `scripts/simulate-traffic.mjs` — weighted synthetic visitor journeys.
- `tests/` — unit, component, and server route tests mirroring the units above.
- `.env.example` — documented non-secret configuration names.
- `.openai/hosting.json` — Sites build, Worker, D1, and runtime declarations.
- `README.md` — local setup, PostHog, Resend, simulation, and deployment notes.

---

### Task 1: Scaffold the deployable Sites application and testing baseline

**Files:**
- Create: generated Vinext starter files including `package.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.openai/hosting.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: approved design specification
- Produces: `npm run dev`, `npm run build`, `npm test`, a configured D1 binding named `DB`, and the base aliases used by all later tasks

- [ ] **Step 1: Scaffold the current empty repository with required capabilities**

Run:

```bash
npm create --yes @openai/sites@0.3.0 . -- --yes --add-ons shadcn,d1 --install
```

Expected: the initializer succeeds without overwriting the two existing docs files and creates `.openai/hosting.json` with a D1 declaration.

- [ ] **Step 2: Add the test dependencies and scripts**

Run:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install posthog-js
```

Add these scripts to `package.json` without replacing the scaffold’s existing scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Write the failing smoke test**

Create `tests/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("introduces Dana's tutoring service", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /personal tutoring/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /find a tutor/i })).toBeInTheDocument();
  });
});
```

Create `vitest.config.ts` with the same `@` alias as the scaffold and `environment: "jsdom"`; create `tests/setup.ts` importing `@testing-library/jest-dom/vitest`.

- [ ] **Step 4: Run the smoke test to verify it fails**

Run: `npm test -- tests/app-shell.test.tsx`

Expected: FAIL because the starter does not contain Dana-specific copy.

- [ ] **Step 5: Apply the first coherent visual slice**

Set metadata in `app/layout.tsx`:

```ts
export const metadata = {
  title: "Bright Path Tutoring | Personal support that clicks",
  description: "Meet a local tutor, see their availability, and book a session in minutes.",
};
```

Replace starter theme tokens in `app/globals.css` with warm cream, deep teal, coral, pale sage, and white surface variables. Replace `app/page.tsx` with a server component that renders a skip link, branded header, hero heading “Personal tutoring that helps confidence click,” a `Find a tutor` button targeting `#tutors`, and a representative tutor-discovery section shell.

- [ ] **Step 6: Run the smoke test and production build**

Run: `npm test -- tests/app-shell.test.tsx && npm run build`

Expected: PASS and a successful Worker-compatible production build.

- [ ] **Step 7: Start and hand off the first meaningful preview**

Run `npm run dev` in a retained terminal session. Make one request to the exact local URL printed by the server and require a non-error response, then open that URL in the Codex browser panel. Reuse the same tab through later HMR updates.

- [ ] **Step 8: Commit the baseline**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts tests/app-shell.test.tsx app .openai .gitignore
git commit -m "feat: scaffold tutoring site experience"
```

---

### Task 2: Add the typed tutor catalog, filters, and responsive profile cards

**Files:**
- Create: `app/data/tutors.ts`
- Create: `app/components/tutor-card.tsx`
- Create: `app/components/tutor-explorer.tsx`
- Create: `tests/tutor-explorer.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `public/tutors/maya.webp`
- Create: `public/tutors/jordan.webp`
- Create: `public/tutors/elena.webp`

**Interfaces:**
- Produces: `Tutor`, `TutorId`, `Subject`, `Grade`, `WeeklySlot`, `TUTORS`, `filterTutors(tutors, subject, grade)`, and `TutorExplorer`
- `Tutor` shape:

```ts
export type Tutor = {
  id: "maya-chen" | "jordan-brooks" | "elena-ruiz";
  name: string;
  image: string;
  imageAlt: string;
  blurb: string;
  subjects: Subject[];
  grades: Grade[];
  rate: number;
  weeklySlots: WeeklySlot[];
};
```

- [ ] **Step 1: Write failing catalog and filtering tests**

Create `tests/tutor-explorer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TutorExplorer } from "@/app/components/tutor-explorer";
import { TUTORS } from "@/app/data/tutors";

describe("TutorExplorer", () => {
  it("shows concrete tutor details", () => {
    render(<TutorExplorer tutors={TUTORS} />);
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("$48 / hour")).toBeInTheDocument();
  });

  it("filters by subject and resets an empty result", async () => {
    const user = userEvent.setup();
    render(<TutorExplorer tutors={TUTORS} />);
    await user.selectOptions(screen.getByLabelText("Subject"), "Chemistry");
    expect(screen.getAllByTestId("tutor-card")).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText("Grade"), "3");
    expect(screen.getByText(/no tutors match/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reset filters/i }));
    expect(screen.getAllByTestId("tutor-card")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/tutor-explorer.test.tsx`

Expected: FAIL because the catalog and components do not exist.

- [ ] **Step 3: Implement the catalog and pure filter**

Create three realistic tutors: Maya Chen (Math/Physics, grades 6–12, $48), Jordan Brooks (English/History, grades 3–10, $42), and Elena Ruiz (Biology/Chemistry, grades 8–12, $52). Give each a concise teaching-style blurb and at least six recurring weekly slots. Export:

```ts
export function filterTutors(tutors: Tutor[], subject: string, grade: string) {
  return tutors.filter((tutor) =>
    (!subject || tutor.subjects.includes(subject as Subject)) &&
    (!grade || tutor.grades.includes(grade as Grade)),
  );
}
```

- [ ] **Step 4: Add portrait assets**

Use the image generation workflow once to create three cohesive, friendly, natural-light tutor headshots with neutral studio backgrounds, one asset per named tutor. Save them at the paths listed above, crop to consistent 4:5 dimensions, and provide specific alt text that describes visible appearance without inferring protected characteristics.

- [ ] **Step 5: Implement cards and filtering UI**

Build `TutorCard` with a semantic image, name heading, blurb, subject chips, grade range, rate, next-available label, and a `View availability for {name}` button. Build `TutorExplorer` with labeled subject and grade selects, an `aria-live="polite"` result count, responsive cards, the tested empty state, and an `onTutorSelected(tutor)` seam for Task 7.

- [ ] **Step 6: Run focused and full tests**

Run: `npm test -- tests/tutor-explorer.test.tsx && npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit tutor discovery**

```bash
git add app/data app/components/tutor-card.tsx app/components/tutor-explorer.tsx app/page.tsx app/globals.css public/tutors tests/tutor-explorer.test.tsx
git commit -m "feat: add tutor discovery and filters"
```

---

### Task 3: Add the privacy-safe PostHog client boundary

**Files:**
- Create: `app/components/posthog-provider.tsx`
- Create: `app/lib/analytics.ts`
- Create: `tests/analytics.test.ts`
- Modify: `app/layout.tsx`
- Modify: `app/components/tutor-explorer.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: tutor/filter types from `app/data/tutors.ts`
- Produces: `AnalyticsEvent`, `AnalyticsProperties`, `capture(event, properties)`, and `PostHogProvider`

- [ ] **Step 1: Write failing event-contract tests**

Create `tests/analytics.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { capture } from "@/app/lib/analytics";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("analytics privacy boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("captures approved tutor metadata", () => {
    capture("tutor_viewed", { tutor_id: "maya-chen", subject: "Math", rate: 48 });
    expect(posthog.capture).toHaveBeenCalledWith("tutor_viewed", {
      tutor_id: "maya-chen", subject: "Math", rate: 48,
    });
  });

  it("drops prohibited keys at runtime", () => {
    capture("booking_completed", {
      tutor_id: "maya-chen", subject: "Math", parent_email: "private@example.test",
    } as never);
    expect(posthog.capture).not.toHaveBeenCalledWith(
      "booking_completed",
      expect.objectContaining({ parent_email: expect.anything() }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/analytics.test.ts`

Expected: FAIL because `capture` does not exist.

- [ ] **Step 3: Implement typed event allowlists**

Define the exact events from the spec and an `ALLOWED_KEYS` map. Before forwarding, rebuild properties from only that event’s allowed keys. Do not mutate the caller’s object. If PostHog is unavailable or not initialized, return without throwing.

```ts
export function capture(event: AnalyticsEvent, properties: Record<string, unknown>) {
  const safe = Object.fromEntries(
    ALLOWED_KEYS[event]
      .filter((key) => properties[key] !== undefined)
      .map((key) => [key, properties[key]]),
  );
  posthog.capture(event, safe);
}
```

- [ ] **Step 4: Initialize PostHog only when configured**

In `PostHogProvider`, initialize once in a client effect using `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`. Use the official current web SDK configuration snapshot, set `person_profiles: "identified_only"`, disable form/input autocapture, and do not call `identify` because parents have no account. Wrap the application in `app/layout.tsx`.

Add to `.env.example`:

```dotenv
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 5: Wire discovery events**

Capture `subject_filter_selected`, `grade_filter_selected`, `tutor_viewed`, and `availability_opened` from deliberate user actions. Include only allowlisted tutor ID, subject, grade band, rate, result count, and discovery context. Mark all form containers with `data-ph-capture-attribute-*` exclusions or the current SDK-recommended masking attributes.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- tests/analytics.test.ts tests/tutor-explorer.test.tsx && npm test`

Expected: all tests PASS.

```bash
git add app/components/posthog-provider.tsx app/lib/analytics.ts app/layout.tsx app/components/tutor-explorer.tsx tests/analytics.test.ts .env.example package.json package-lock.json
git commit -m "feat: add privacy-safe PostHog telemetry"
```

---

### Task 4: Build deterministic availability and the D1 booking repository

**Files:**
- Create: `app/lib/availability.ts`
- Create: `app/lib/bookings.server.ts`
- Create: `migrations/0001_create_bookings.sql`
- Create: `tests/availability.test.ts`
- Create: `tests/bookings-repository.test.ts`
- Modify: `.openai/hosting.json`

**Interfaces:**
- Consumes: `Tutor`, `TutorId`, and `WeeklySlot`
- Produces: `AvailableSlot { startsAt: string; label: string }`, `generateUpcomingSlots(tutor, now, days)`, `removeBookedSlots(slots, bookedStartsAt)`, `BookingRepository.listBookedSlots(tutorId, from, to)`, and `BookingRepository.reserve(input)`
- `reserve` returns `{ ok: true; bookingId: string } | { ok: false; reason: "slot_taken" }`

- [ ] **Step 1: Write failing availability tests**

Create `tests/availability.test.ts` with a fixed UTC clock and assertions that generated slots fall within the next 14 days, are chronological, and exclude supplied booked timestamps:

```ts
it("subtracts a confirmed booking", () => {
  const slots = [{ startsAt: "2026-09-07T23:00:00.000Z", label: "Mon, Sep 7 · 4:00 PM" }];
  expect(removeBookedSlots(slots, [slots[0].startsAt])).toEqual([]);
});
```

- [ ] **Step 2: Run the availability test to verify it fails**

Run: `npm test -- tests/availability.test.ts`

Expected: FAIL because the availability module does not exist.

- [ ] **Step 3: Implement deterministic slot generation**

Generate the next 14 days in `America/Los_Angeles`, converting recurring weekday/time definitions to ISO UTC values with `Intl.DateTimeFormat`-based formatting. Inject `now` into the pure function; do not read the clock inside tests.

- [ ] **Step 4: Add the migration**

Create `migrations/0001_create_bookings.sql`:

```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  tutor_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  student_first_name TEXT NOT NULL,
  student_grade TEXT NOT NULL,
  requested_subject TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tutor_id, starts_at)
);

CREATE INDEX bookings_by_tutor_and_time
ON bookings (tutor_id, starts_at);
```

- [ ] **Step 5: Write failing repository tests**

Use a small fake D1 statement adapter to test parameter binding and simulate `SQLITE_CONSTRAINT_UNIQUE`. Assert that the first reservation returns `ok: true`, a duplicate returns `{ ok: false, reason: "slot_taken" }`, and other database errors are rethrown.

- [ ] **Step 6: Implement the D1 repository**

Expose `createBookingRepository(db: D1Database)`. Generate IDs with `crypto.randomUUID()`, insert with positional bindings, translate only the unique-constraint error into `slot_taken`, and keep listing queries bounded by tutor and date range.

- [ ] **Step 7: Run tests and commit**

Run: `npm test -- tests/availability.test.ts tests/bookings-repository.test.ts && npm test`

Expected: all tests PASS.

```bash
git add app/lib/availability.ts app/lib/bookings.server.ts migrations tests/availability.test.ts tests/bookings-repository.test.ts .openai/hosting.json
git commit -m "feat: persist tutor slot reservations"
```

---

### Task 5: Add validated availability and booking server routes

**Files:**
- Create: `app/lib/booking-schema.ts`
- Create: `app/api/availability/route.ts`
- Create: `app/api/bookings/route.ts`
- Create: `tests/booking-schema.test.ts`
- Create: `tests/booking-routes.test.ts`

**Interfaces:**
- Consumes: tutor catalog, availability functions, `BookingRepository`, and Task 6’s `sendBookingEmails` seam
- Produces: `BookingInput`, `parseBookingInput(value)`, `GET /api/availability?tutorId=...`, and `POST /api/bookings`
- Booking response:

```ts
type BookingResponse =
  | { ok: true; booking: { tutorId: string; tutorName: string; startsAt: string; subject: string; rate: number }; email: { parent: "sent" | "delayed"; owner: "sent" | "delayed" } }
  | { ok: false; code: "invalid_request" | "slot_taken" | "server_error"; fieldErrors?: Record<string, string> };
```

- [ ] **Step 1: Write failing schema tests**

Test trimming, normalized lowercase email, required fields, real tutor IDs, supported tutor subjects/grades, and exact slot membership. Assert that invalid input returns field-specific messages and never echoes raw unexpected values.

- [ ] **Step 2: Run the schema tests to verify they fail**

Run: `npm test -- tests/booking-schema.test.ts`

Expected: FAIL because `parseBookingInput` does not exist.

- [ ] **Step 3: Implement schema validation**

Implement a discriminated return type:

```ts
type ParseResult =
  | { ok: true; data: BookingInput }
  | { ok: false; fieldErrors: Record<string, string> };
```

Reject unsupported tutor/subject/grade combinations and slots outside the generated schedule. Limit every string length before persistence.

- [ ] **Step 4: Write failing route tests**

Mock the repository and email seams. Cover: availability for a valid tutor, unknown tutor 404, valid reservation 201, malformed body 400, duplicate slot 409, email failure still 201 with `delayed`, and unexpected repository failure 500 with the generic `server_error` code.

- [ ] **Step 5: Run the route tests to verify they fail**

Run: `npm test -- tests/booking-routes.test.ts`

Expected: FAIL because both routes are missing.

- [ ] **Step 6: Implement the routes**

Availability reads booked timestamps for the generated date window and returns the difference. Booking validates first, reserves through D1 second, and invokes email only after a successful insert. Never log the submitted names or email. Return `Cache-Control: no-store` for both routes.

- [ ] **Step 7: Run tests and commit**

Run: `npm test -- tests/booking-schema.test.ts tests/booking-routes.test.ts && npm test`

Expected: all tests PASS.

```bash
git add app/lib/booking-schema.ts app/api tests/booking-schema.test.ts tests/booking-routes.test.ts
git commit -m "feat: add booking and availability APIs"
```

---

### Task 6: Add Resend transactional email with safe configuration

**Files:**
- Create: `app/lib/env.server.ts`
- Create: `app/lib/email.server.ts`
- Create: `tests/email.test.ts`
- Modify: `app/api/bookings/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: normalized `BookingInput` and selected `Tutor`
- Produces: `EmailDelivery = "sent" | "delayed"` and `sendBookingEmails(booking, tutor, fetchImpl?)`

- [ ] **Step 1: Write failing email tests**

Mock `fetch` and assert exactly two POSTs to `https://api.resend.com/emails`, an `Authorization: Bearer ...` header, parent and owner recipients, escaped names, the tutor/date/rate summary, and independent delivery results. Add cases for missing configuration and one provider rejection.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/email.test.ts`

Expected: FAIL because the email module does not exist.

- [ ] **Step 3: Implement configuration validation**

Read only these server values:

```ts
type EmailConfig = {
  resendApiKey: string;
  resendFrom: string;
  danaNotificationEmail: string;
  publicSiteOrigin: string;
};
```

Return `null` when email configuration is incomplete so local bookings still work with a `delayed` status. Do not expose this object to client modules.

- [ ] **Step 4: Implement independent Resend requests**

Build plain-text and minimal semantic HTML messages. Escape user-controlled HTML. Use `Promise.allSettled` so one recipient’s failure does not block the other. Return `{ parent, owner }` with `sent` only for a 2xx response. Log only recipient role, provider status, and request correlation—not addresses or booking values.

- [ ] **Step 5: Document configuration names**

Append to `.env.example`:

```dotenv
RESEND_API_KEY=
RESEND_FROM=Bright Path Tutoring <bookings@example.com>
DANA_NOTIFICATION_EMAIL=
PUBLIC_SITE_ORIGIN=http://localhost:3000
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- tests/email.test.ts tests/booking-routes.test.ts && npm test`

Expected: all tests PASS.

```bash
git add app/lib/env.server.ts app/lib/email.server.ts app/api/bookings/route.ts tests/email.test.ts .env.example
git commit -m "feat: send booking confirmation emails"
```

---

### Task 7: Complete the accessible booking sheet and client journey

**Files:**
- Create: `app/components/booking-sheet.tsx`
- Create: `tests/booking-sheet.test.tsx`
- Modify: `app/components/tutor-explorer.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: availability and booking routes, `Tutor`, `AvailableSlot`, and `capture`
- Produces: `BookingSheet({ tutor, open, onOpenChange, onBooked })`

- [ ] **Step 1: Write failing happy-path component test**

Mock availability and booking responses, then assert that a parent can open Maya’s availability, select a labeled slot, enter the five requested fields, review, confirm, and see a success summary. Assert `booking_started`, `booking_submitted`, and `booking_completed` with no form values.

- [ ] **Step 2: Write failing edge-state tests**

Add tests for field validation and focus, no slots, loading, 409 slot conflict with refreshed availability, retryable network failure retaining entries, and successful booking with `email.parent === "delayed"`.

- [ ] **Step 3: Run the component tests to verify they fail**

Run: `npm test -- tests/booking-sheet.test.tsx`

Expected: FAIL because `BookingSheet` does not exist.

- [ ] **Step 4: Implement the sheet state machine**

Use the installed Shadcn `Sheet` primitive. Keep explicit states: `slot`, `details`, `review`, `submitting`, `success`, and `error`. Fetch availability on open with `cache: "no-store"`; abort stale requests. Preserve form values after retryable failures and slot conflicts, but clear the invalid selected slot.

- [ ] **Step 5: Implement accessibility and privacy behavior**

Use real labels, inline error IDs with `aria-describedby`, an `aria-live` status region, focus the first invalid control, and return focus to the tutor action when the sheet closes. Add `data-ph-no-capture` to the form and sensitive inputs. Disable motion under `prefers-reduced-motion`.

- [ ] **Step 6: Finish responsive page composition**

Wire `TutorExplorer` to the sheet. Add a concise “How it works” strip and a final reassurance section without creating another route. On mobile, make the sheet full viewport height and keep the active primary action above the safe-area inset; on desktop, use a readable side panel.

- [ ] **Step 7: Run focused tests, full tests, and build**

Run: `npm test -- tests/booking-sheet.test.tsx tests/tutor-explorer.test.tsx && npm test && npm run build`

Expected: all tests PASS and production build succeeds.

- [ ] **Step 8: Commit the complete parent journey**

```bash
git add app/components/booking-sheet.tsx app/components/tutor-explorer.tsx app/page.tsx app/globals.css tests/booking-sheet.test.tsx
git commit -m "feat: complete tutor booking journey"
```

---

### Task 8: Add the synthetic traffic and booking simulator

**Files:**
- Create: `scripts/simulate-traffic.mjs`
- Create: `tests/simulate-traffic.test.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: deployed base URL, PostHog project token/host, public booking routes, fixed tutor IDs
- Produces: `chooseWeighted(options, random)`, `buildJourney(random)`, `runJourney(journey, config)`, and `npm run simulate:traffic`

- [ ] **Step 1: Write failing deterministic simulator tests**

Import the pure helpers with a seeded random stub. Assert that every event has `traffic_type: "synthetic"`, distinct IDs start with `synthetic-`, allowed sources include direct/search/Facebook UTM, and generated payloads never contain `parent_name`, `parent_email`, or `student_first_name` analytics properties.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/simulate-traffic.test.ts`

Expected: FAIL because simulator helpers do not exist.

- [ ] **Step 3: Implement weighted journeys**

Use these default outcomes so funnels look realistic:

```js
const OUTCOMES = [
  { value: "bounce", weight: 25 },
  { value: "filter_exit", weight: 20 },
  { value: "tutor_exit", weight: 20 },
  { value: "availability_exit", weight: 15 },
  { value: "booking", weight: 18 },
  { value: "slot_conflict", weight: 2 },
];
```

Send analytics through PostHog’s `/capture/` HTTP endpoint with an anonymous synthetic distinct ID and `$current_url`, `$referrer`, UTM, tutor, subject, grade band, and permitted funnel properties. For booking outcomes, fetch live availability and submit fictitious `.test` identities to the website route. Support `--sessions`, `--concurrency`, `--dry-run`, and `--seed`; default to 100 sessions and concurrency 5.

- [ ] **Step 4: Add safe execution guardrails**

Require `SIMULATION_ALLOWED=true` for non-dry runs. Refuse a base URL that is missing `https://` unless it is localhost. Cap sessions at 2,000 and concurrency at 20. Print aggregate counts only, not booking payloads.

- [ ] **Step 5: Add script and usage notes**

Add `"simulate:traffic": "node scripts/simulate-traffic.mjs"` to `package.json`. Document dry-run and real examples plus how to filter `traffic_type = synthetic` in PostHog.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- tests/simulate-traffic.test.ts && npm test`

Expected: all tests PASS.

```bash
git add scripts/simulate-traffic.mjs tests/simulate-traffic.test.ts package.json README.md
git commit -m "feat: add synthetic traffic simulator"
```

---

### Task 9: Verify, configure, deploy, and demonstrate the prototype

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `.openai/hosting.json`
- Modify: any source or test file only when verification reveals a concrete defect

**Interfaces:**
- Consumes: all prior tasks and user-supplied PostHog project token
- Produces: deployed Sites URL, applied D1 migration, verified PostHog capture, verified Resend test delivery, and synthetic demo traffic

- [ ] **Step 1: Complete configuration documentation**

Document exact local and hosted variables, D1 migration command from the generated Sites project, Resend test-recipient limitation, domain-verification step, PostHog host selection, and simulator safety flags. Confirm `.gitignore` excludes `.env` and `.dev.vars`.

- [ ] **Step 2: Run the complete automated verification**

Run:

```bash
npm test
npm run build
npm run simulate:traffic -- --dry-run --sessions 25 --seed 42
```

Expected: all tests PASS, build succeeds, and dry-run reports 25 privacy-safe synthetic sessions without network calls.

- [ ] **Step 3: Inspect the production package contract**

Confirm the Worker entrypoint produced by the build exports a default object with callable `fetch(request, env, ctx)`. Confirm `.openai/hosting.json` binds `DB` and points to the correct build output. If the scaffold produces a static-only build, change it to the server-backed Sites configuration before deploying because booking and D1 routes require a Worker.

- [ ] **Step 4: Perform explicit browser QA in the existing preview tab**

At desktop and phone widths, verify: skip link, filters, zero-results reset, tutor card content, keyboard focus, sheet focus containment, slot selection, validation, successful booking, disappearing booked slot, duplicate conflict, and delayed-email messaging. Inspect PostHog requests for the exact event names and verify no form values appear in payloads.

- [ ] **Step 5: Configure hosted values and deploy through Sites**

Configure the user’s PostHog project token/host, Resend API key/from address, Dana notification email, public origin, and D1 migration through the Sites deployment flow. Build, create a version, deploy it, and verify terminal deployment status before reporting success.

- [ ] **Step 6: Prove real integrations**

Make one permitted Resend test booking and confirm the provider accepts both requested messages under the account’s current test-recipient restrictions. Visit the deployed site with a Facebook-style UTM URL, complete a synthetic browsing journey, and confirm the expected PostHog events arrive with referral fields and without personal data.

- [ ] **Step 7: Run controlled demo traffic**

Run:

```bash
SIMULATION_ALLOWED=true npm run simulate:traffic -- --sessions 100 --concurrency 5 --seed 20260904
```

Expected: summary totals equal 100 sessions; booking outcomes may be lower when available sample slots are exhausted, and all analytics events carry `traffic_type: "synthetic"`.

- [ ] **Step 8: Re-run final verification and commit documentation/fixes**

Run: `npm test && npm run build && git diff --check`

Expected: all checks PASS with no whitespace errors.

```bash
git add README.md .env.example .openai/hosting.json app tests scripts migrations package.json package-lock.json
git commit -m "docs: finalize tutoring prototype operations"
```

- [ ] **Step 9: Stop the retained development server and report the deployed URL**

Stop the preview terminal after hosting succeeds. Return the deployed Sites URL as the primary deliverable and summarize the verified booking, Resend, PostHog, and simulator outcomes.
