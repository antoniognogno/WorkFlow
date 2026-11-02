# WorkFlow

Why?

Because I needed this app (pwa) with these funciontality free.

What is?
WorkFlow is a mobile-first Progressive Web App for tracking working activities, calculating compensation, and managing payment status. It is designed for people who work recurring shifts or assignments for multiple clients and need a clear separation between jobs, work logs, reports, and received payments. 

This repository is also a practical portfolio project. It demonstrates full-stack product thinking across UI design, authentication, relational data modelling, row-level security, testing, PWA delivery, and iterative development with AI-assisted engineering.

### Current capabilities

#### Job and client management

- Create, edit, and delete jobs.
- Store client, hourly rate, overtime settings, and overtime multiplier.
- Create reusable time presets.
- Protect potentially dangerous historical rate changes with an explicit `Conferma` confirmation.
- Keep jobs for different clients separate even when they have the same name.

#### Activity register

Each work entry can include:

- job and client;
- date;
- start and end time;
- break/rest minutes;
- overtime minutes.

Entries can be created, edited, moved to the trash, restored, or permanently deleted. Compact time input such as `0900` and `1130` is normalized to `09:00` and `11:30`.

#### Reporting

The reporting view supports:

- predefined and custom date ranges;
- job and client filters;
- total hours and compensation;
- breakdown by job/client;
- optional grouping of jobs with the same name;
- customizable total-line templates;
- copying and WhatsApp sharing.

Grouping affects only the report summary. Detailed entries and payment records remain separated.

#### Payments and statement

The dedicated Payments area supports:

- selecting individual entries or all entries for a job;
- previewing selected hours, jobs, entries, and expected amount;
- marking multiple entries as paid;
- setting a payment date, defaulting to today;
- optional payment method and note;
- editing payment details;
- cancelling a payment with explicit `Annulla` confirmation;
- monthly received and outstanding totals.

The statement view can be filtered by day, week, month, quarter, six months, year, or custom dates. Cancelling a payment does not remove the underlying work entry; it returns the amount to the outstanding balance.

### Technical stack

- React and TypeScript
- Vite
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Row Level Security (RLS)
- Vitest, jsdom, and Testing Library
- vite-plugin-pwa
- Lucide React
- Sonner notifications

### Local development

Requirements:

- Node.js 22+
- npm
- a Supabase project

Install dependencies:

```bash
npm install
```

Create `.env.local` in the repository root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start the development server:

```bash
npm run dev
```

The app is normally available at `http://localhost:5173`.

Useful commands:

```bash
npm test              # run automated tests
npm run test:watch    # interactive test mode
npm run test:coverage # generate coverage
npm run lint          # run ESLint
npm run build         # type-check and build the PWA
npm run preview       # preview the production build
```

### Supabase setup

The main database schema is in [supabase/schema.sql](./supabase/schema.sql). Existing databases may also require:

1. [supabase/migration-entries-features.sql](./supabase/migration-entries-features.sql)
2. [supabase/migration-payment-details.sql](./supabase/migration-payment-details.sql)

The application uses RLS policies based on `auth.uid() = user_id`, so users can only access their own data through the client application.

The frontend must use only the Supabase anonymous key. The `service_role` key must never be exposed in the browser, `.env.local` used by the PWA, or a production bundle.

The example import script [supabase/import-activities-0824e081.sql](./supabase/import-activities-0824e081.sql) is an idempotent, user-specific SQL import. It must be reviewed before execution and is not run automatically by the application.

### Testing approach

The automated tests mount the real React views in jsdom and simulate user interactions. Database operations are represented by mocked callbacks, so the tests do not require production credentials or a live Supabase project.

The current suite covers:

- job creation and editing;
- activity creation and editing;
- duplicate job names with different clients;
- payment confirmation, editing, and cancellation;
- report grouping;
- custom select behavior;
- date, duration, currency, and period utilities.

Before a code change is considered complete, the local validation sequence is:

```bash
npm test
npm run lint
npm run build
```

### Security and data boundaries

Supabase queries use the typed client/query builder rather than concatenating user-controlled SQL. Data isolation is enforced by authentication and RLS, not by frontend filtering alone.

Administrative actions such as bulk deletion or transferring data between users must be performed through a protected SQL Editor workflow or a server-side administrative process, never through an exposed client-side admin key.

### Project structure

```text
src/
  components/
    auth/       authentication
    jobs/       jobs and time presets
    layout/     navigation and layout
    payments/   payments and statement
    profile/    profile and settings
    register/   activity register
    report/     reporting and sharing
    ui/         reusable UI components
  lib/
    supabase.ts Supabase client
    utils.ts    calculation and formatting helpers
  App.tsx       application state and data operations
supabase/
  schema.sql
  migration-*.sql
tests/
  *.test.tsx
```

### AI-assisted development and learning

This project was developed with the support of an AI assistant using the Copilot SDK in VS Code. I used the collaboration to learn and apply GenAI-assisted software engineering practices, including:

- breaking product requirements into implementable changes;
- exploring an unfamiliar codebase before editing;
- using AI to challenge UI/UX and security decisions;
- generating test ideas and then validating them locally;
- reviewing generated code, correcting failures, and checking assumptions;
- writing explicit prompts and acceptance criteria;
- using AI as a pair-programming and review tool rather than as a replacement for engineering judgement.

I remained responsible for the product decisions, integration of the changes, validation, and final review. The project reflects an iterative workflow: requirements were refined through feedback, implementation was tested against real UI flows, and failures were investigated rather than hidden.

### Project status

WorkFlow is usable and actively evolving. Known future improvements include:

- a complete audit trail for payment changes;
- in-app JSON import with preview and validation;
- end-to-end tests against a dedicated Supabase test project;
- more advanced roles and administrative workflows;
- bundle optimization and route-level code splitting.
- Make the name of people and work as creatable labels instead of strings

---

## Italiano
Ho creato questa pwa perchè mi serviva con queste funzionalità gratuite e non come le verisoni a pagamento di app simili.

WorkFlow è una Progressive Web App mobile-first per registrare attività lavorative, calcolare compensi e gestire i pagamenti ricevuti o ancora da ricevere.

Permette di:

- gestire lavori, clienti, tariffe e straordinari;
- registrare ore, pause e attività;
- distinguere lavori con lo stesso nome ma clienti diversi;
- creare report filtrabili e raggruppabili;
- confermare, modificare e annullare pagamenti;
- consultare un estratto conto per giorno, settimana, mese, trimestre, sei mesi, anno o intervallo personalizzato;
- funzionare come PWA installabile su dispositivo mobile.

Il progetto usa React, TypeScript, Vite, Tailwind CSS, Supabase, PostgreSQL, RLS, Vitest e Testing Library.

Per l'avvio locale:

```bash
npm install
npm run dev
```

È necessario configurare `.env.local` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

I test automatici simulano i flussi principali dell'interfaccia senza usare un database reale. Prima di una modifica vengono eseguiti:

```bash
npm test
npm run lint
npm run build
```

Ho sviluppato il progetto con il supporto di un assistente AI usando Copilot SDK in VS Code. Questa collaborazione mi ha permesso di sviluppare competenze pratiche di GenAI-assisted software engineering: analisi dei requisiti, decomposizione del lavoro, generazione di idee di test, revisione critica dell'output, debugging e validazione locale. Le decisioni di prodotto, l'integrazione, i controlli e la responsabilità finale del codice sono rimasti miei.
