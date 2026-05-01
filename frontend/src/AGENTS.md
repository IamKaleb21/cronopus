# AGENTS.md

**Generated:** 2026-04-27
**Commit:** ae5419e

## OVERVIEW
React 19 + Vite SPA. Dashboard for job management, CV generation (LaTeX + Gemini), and Telegram triage. All server state via React Query.

## STRUCTURE
```
src/
├── pages/         # Route pages (Dashboard, EditorPage, GeneratedCvs, History, Profile, Templates, Login)
├── components/    # UI components + shadcn/ui primitives
│   └── ui/        # shadcn/ui components (dialog, sheet, form, table, etc.)
├── hooks/         # useJobs, useJobFilters, useCvs, useTemplate, use-mobile
├── services/      # api.ts — Axios + React Query client
├── lib/           # auth, utils, parseJobDescription, departmentFromLocation
├── types.ts       # Shared TypeScript types
├── Layout.tsx     # App shell with sidebar
└── App.tsx        # Router + QueryClient setup
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| API client | `services/api.ts` | Axios instance, all endpoints |
| Job data | `hooks/useJobs.ts` | React Query hooks for jobs |
| CV data | `hooks/useCvs.ts` | Generated CVs CRUD |
| CV generation | `components/GenerateCvModal.tsx` | Gemini prompt → LaTeX flow |
| LaTeX editor | `components/LatexEditor.tsx` | Monaco-based editor |
| PDF preview | `components/PdfPreview.tsx` | iframe render |
| Job cards | `components/JobCard.tsx` | Status badge, Save/Discard actions |
| Job detail | `components/JobDetailModal.tsx` | Full job info + generate CV |
| Job filters | `hooks/useJobFilters.ts` | Filter/sort state |

## CONVENTIONS
- shadcn/ui only — `pnpm dlx shadcn@latest add <component>`
- Lucide icons — import from `lucide-react`
- Theming — CSS variables in `index.css` (Lavender Nights palette)
- Server state — React Query (`@tanstack/react-query`), no local Zustand/Redux
- Auth — `lib/auth.ts` checks token, `components/AuthGuard.tsx` wraps protected routes
- TDD mandatory — same `.test.tsx` collocated alongside each module

## ANTI-PATTERNS
- `components/ui/` is shadcn output — do not edit manually, re-add via CLI
- API calls go through `services/api.ts` only — no direct fetch in components
- Job status transitions are API-driven — do not mutate local state for status changes
