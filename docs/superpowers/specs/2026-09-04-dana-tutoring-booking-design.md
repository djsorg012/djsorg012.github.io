# Dana Tutoring Booking Website Design

## Purpose

Create a clean, friendly, mobile-first tutoring website where parents can compare a fixed set of tutors, see live availability, and book a session without creating an account. The first version will support persistent demo bookings, real transactional email through Resend, and privacy-conscious PostHog analytics. It will not include online payments or tutor self-management.

## Success Criteria

- A parent can find a suitable tutor by subject or grade without navigating through multiple pages.
- Tutor cards clearly show subjects, supported grades, rate, photo, teaching style, and next availability.
- A parent can choose an available time, provide the required parent and student details, and submit a booking from the same page.
- A confirmed slot immediately becomes unavailable and cannot be double-booked.
- A successful booking triggers a parent confirmation email and a notification email to Dana through Resend.
- PostHog shows which tutors and subjects attract interest, where visitors come from, and where visitors leave the booking funnel.
- The complete experience is accessible and comfortable to use on a phone.

## Scope

### Included

- One-page tutor discovery and booking journey
- Fixed sample tutor catalog maintained in source code
- Subject and grade filters
- Live tutor availability derived from recurring sample slots and stored bookings
- Persistent booking records
- Resend integration for parent and owner emails
- PostHog page, referral, campaign, discovery, and booking-funnel telemetry
- A traffic simulation script that produces realistic browsing, drop-off, and booking behavior
- Responsive, accessible loading, empty, validation, conflict, success, and failure states

### Excluded

- Parent accounts or authentication
- Online payments or invoices
- Tutor administration or content management
- Tutor-created schedules
- SMS delivery
- Automated rescheduling or cancellation
- A recommendation or matching algorithm

## Experience Design

### Visual Direction

The site should feel warm, trustworthy, and personal rather than corporate. The palette will use a warm cream background, deep teal typography, coral accents, and softer supporting colors. Cards and controls will use restrained rounded corners, generous spacing, and clear type hierarchy. Human tutor photography will support trust without overwhelming the interface.

The desktop layout will remain compact and editorial. On phones, filters and primary actions will remain easy to reach, tutor cards will stack, and the booking panel will become a full-screen sheet with large touch targets.

### Page Structure

1. A concise hero states the benefit of personal tutoring and offers a prominent “Find a tutor” action.
2. A discovery section lets parents filter tutors by subject and grade.
3. Tutor cards show photo, name, teaching style, subjects, supported grades, hourly rate, and next available time.
4. Selecting a tutor opens an in-page booking panel rather than navigating away.
5. The panel guides the parent through slot selection, required details, review, and confirmation.
6. A success state summarizes the appointment and explains that confirmation email is being sent.

### Booking Form

The form collects only the information Dana requested:

- Parent name
- Parent email
- Student first name
- Student grade
- Requested subject
- Selected tutor and time, inherited from the current booking context

All fields are validated on both client and server. There are no parent accounts and no payment step.

## Technical Architecture

### Front End

The site will use the standard Sites React/Vinext application structure. One primary page will own the discovery and booking journey. Focused components will separate tutor filters, tutor cards, availability, booking details, review, and confirmation so each unit has a clear responsibility.

Tutor profiles and recurring sample availability will be static typed data in source control. Client state will hold filters and the active booking panel. The server remains authoritative for current slot availability and booking completion.

### Persistence and Booking Flow

A small hosted SQLite/D1 database will store completed bookings. Availability is calculated from the fixed schedule minus confirmed bookings.

The booking request will:

1. Validate all submitted values against the server-side tutor catalog and allowed availability.
2. Begin a database transaction and attempt to reserve the selected tutor and time using a uniqueness constraint.
3. Return a conflict response if the slot was already reserved.
4. Persist the booking when the reservation succeeds.
5. Trigger the two Resend email requests.
6. Return booking confirmation plus email-delivery status to the browser.

The database uniqueness rule is the final defense against double booking. After success or conflict, the client refreshes availability so every displayed slot reflects server state.

### Email

Resend will send:

- A parent confirmation with tutor, subject, student first name, date, time, rate, and Dana’s contact details.
- A Dana notification with the booking details needed to follow up and invoice the parent.

The Resend API key, sender address, and Dana notification address will be runtime secrets or configuration and will not be committed. Without a verified sending domain, Resend test mode can demonstrate delivery only within its allowed recipient constraints. Unrestricted delivery requires a verified domain.

A booking remains confirmed if email delivery fails. The response records separate delivery outcomes, the interface says confirmation is delayed, and server logs retain enough non-sensitive context to diagnose the provider failure. No secret or full booking payload is logged.

## PostHog Telemetry

PostHog initializes only when a public project token is configured. The token and host are injected through environment configuration rather than hard-coded into source. Standard page-view, referring-domain, and UTM campaign data will be captured alongside explicit product events.

### Events

- `tutor_viewed`: tutor ID, display name, subject list, rate, and discovery context
- `subject_filter_selected`: selected subject and resulting tutor count
- `grade_filter_selected`: selected grade and resulting tutor count
- `availability_opened`: tutor ID and available-slot count
- `booking_started`: tutor ID, selected subject, grade band, and slot context
- `booking_submitted`: tutor ID, subject, grade band, and slot context
- `booking_completed`: tutor ID, subject, grade band, slot context, and email-delivery outcomes
- `booking_failed`: failure category, tutor ID, subject, grade band, and slot context

### Privacy Rules

PostHog events must never include parent names, parent emails, student names, free-text fields, booking record IDs, or raw server error messages. Subject, grade band, tutor ID, rate, slot context, device data, referring domain, and UTM fields are allowed. Form inputs will not be autocaptured; sensitive elements will be marked so session replay, if enabled later, cannot record their values.

### Reporting Questions

The event model supports Dana’s questions:

- Tutor interest: count and conversion rate from `tutor_viewed` by tutor.
- Subject demand: filter selections and booking completions by subject.
- Booking funnel: availability opened → booking started → submitted → completed.
- Abandonment: visitors with discovery or booking events but no completion.
- Acquisition: conversion and tutor interest segmented by referring domain and UTM campaign, including local Facebook groups.

## Traffic Simulation

A separate script will send realistic, synthetic traffic through the deployed application. It will use labeled synthetic sessions and weighted journeys rather than uniform random events. Journeys will include:

- Landing and leaving without interacting
- Filtering by subject or grade and leaving
- Viewing one or more tutors
- Opening availability and abandoning
- Completing a booking
- Attempting a slot that has already been booked

Traffic sources will include direct, search, and Facebook-style referral/UTM scenarios. Subjects and tutor choices will be weighted so the resulting reports show meaningful differences. Synthetic events will include a `traffic_type: "synthetic"` property so they can be included for demonstrations or excluded from real reporting. The simulator will avoid sending personal data and will use clearly fictitious booking identities.

## Error and Edge States

- Loading: availability and submission controls show progress without shifting the layout.
- No matching tutors: explain that no tutors match and offer a one-tap filter reset.
- No available slots: keep the tutor profile visible and invite the parent to choose another tutor.
- Invalid form: place clear messages beside the relevant fields and move focus to the first error.
- Slot conflict: explain that the time was just taken, refresh availability, and preserve the non-sensitive form fields.
- Network or server failure: keep entered data in place and offer a retry.
- Email failure after booking: confirm the appointment but explain that the email is delayed.

## Accessibility and Responsive Behavior

- All controls have programmatic labels and visible keyboard focus.
- Tutor cards and slots use semantic buttons rather than clickable containers.
- The booking sheet traps focus while open, closes predictably, and returns focus to its originating tutor.
- Status and validation messages are announced appropriately without excessive interruption.
- Color contrast meets WCAG AA, and meaning never depends on color alone.
- Touch targets and spacing accommodate one-handed phone use.
- Motion respects reduced-motion preferences.

## Verification

Automated tests will cover filtering, tutor selection, required fields, valid booking, duplicate-slot prevention, availability refresh, PostHog event names and allowed properties, and email-provider failure behavior. Server tests will verify validation and the uniqueness guarantee. The production build must succeed.

Browser verification will cover the primary phone and desktop journey: find a tutor, select a slot, complete a booking, see the slot disappear, and confirm a duplicate attempt is handled. PostHog network calls will be checked for the specified events and absence of personal information. Email delivery will be tested with Resend’s permitted test recipient until a verified domain is available.

## Configuration and Deployment

The deployed site will require:

- PostHog project token and host
- Resend API key
- Resend sender address
- Dana notification address
- Public site origin

Local example configuration will document each value without containing secrets. The PostHog token supplied by the project owner will be configured outside tracked source. Hosting will use Sites with a D1 binding for persistent bookings and Cloudflare-compatible server output.

## Future Extensions

Later iterations may add tutor administration, schedule management, SMS notifications, cancellation and rescheduling, invoices or payments, and richer tutor detail pages. These are intentionally excluded from this implementation so the first release remains easy for parents and manageable for Dana.
