# Bright Path Tutoring

A static, mobile-first tutoring booking prototype for Dana. Booked slots use `localStorage`, so availability changes are intentionally device-local for this GitHub Pages simulation.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Add the `VITE_POSTHOG_*` values to enable privacy-safe product events. For real email, create one EmailJS service and two templates (parent confirmation and Dana notification), then add the EmailJS values from `.env.example`. Template variables: `parent_name`, `parent_email`, `student_first_name`, `student_grade`, `subject`, `tutor_name`, `session_time`, `rate`, `dana_email`, and `to_email`.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests and builds `dist/` on every push to `main`. In Settings → Pages, choose **GitHub Actions**. Add EmailJS/PostHog values as Actions secrets and `VITE_POSTHOG_HOST` as a repository variable.

## Synthetic PostHog traffic

```bash
npm run simulate:traffic -- --dry-run --sessions 100
SIMULATION_ALLOWED=true POSTHOG_PROJECT_KEY=phc_xxx npm run simulate:traffic -- --sessions 100
```

Filter `traffic_type = synthetic` in PostHog to include or exclude demo traffic.

## Prototype portrait sources

- Maya: [Uchi tutoring](https://www.doma.uchi.ru/about)
- Jordan: [Filo tutor profile](https://askfilo.com/physics-c-mechanics-online-tutors-delta)
- Elena: [Profe Particular](https://profeparticular.es/)

Replace these demonstration portraits with Dana’s tutor-approved photography before a public client launch.
