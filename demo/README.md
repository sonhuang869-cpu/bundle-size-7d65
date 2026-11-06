# ReconTrace — Automated Financial Reconciliation Platform

Enterprise-grade reconciliation platform for financial operations teams. Dark-themed, data-intensive UI designed to compete with Anaplan, FloQast, and Vena Solutions.

## Features

- **Dashboard** — Match rate trends, SLA compliance, exception aging heatmap, and top exception sources — all derived from seed data
- **Reconciliation Sets** — Overview of 3 pre-loaded datasets with match gauges, status, and quick actions
- **Workspace** — Side-by-side ledger view with Source A vs Source B, confidence scoring, pagination, and period lock
- **Exception Queue** — Sortable/filterable table with aging buckets, drill-down detail, full resolution workflow (Approve / Force Match / Write-off / Escalate / Defer)
- **Data Import** — CSV drop zones for Source A and Source B, automated matching engine with progress indicator, confidence distribution, matched pairs table, and unmatched panels
- **Settings** — SLA targets, financial controls, user roles, and demo data reset

## Seed Data

| Dataset | Items | Match Rate | Exceptions |
|---|---|---|---|
| Bank Statement vs General Ledger | 143 | 95.8% | 6 open |
| AR Subledger vs Trial Balance | 89 | 91.0% | 8 (2 escalated) |
| Intercompany Eliminations | 56 | 100% | 0 (closed) |

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- React Router v6
- Recharts (real data charts)
- Lucide React icons
- Sonner (notifications)

## Setup

```bash
npm install
npm run dev      # development server
npm run build    # production build
```

## Routes

| Path | Page |
|---|---|
| `/` | Dashboard |
| `/reconciliations` | Reconciliation Sets |
| `/workspace?id=recon-001` | Reconciliation Workspace |
| `/exceptions?recon=recon-001` | Exception Queue |
| `/import` | Data Import |
| `/settings` | Settings |

## Demo credentials

No login required. User is Henry Muchori — Sr. Financial Operations.

## Persistence

Exception resolutions and workspace lock state persist in `localStorage`. Use **Settings → Reset Demo** to restore initial seed state.

## Limitations

- Backend-free: all data is in-memory / localStorage
- CSV import parsing assumes the sample column format
- No real authentication; session is simulated
- Charts use seed data, not live metrics

## Deployment

Vercel SPA routing is configured via `vercel.json`. Deploy with:

```bash
vercel --prod
```
