# Music Hub

Music Hub is a personal cloud music locker and streaming service that allows users to securely store their own audio files in cloud storage and stream them seamlessly across web and mobile platforms.

---

## Documentation

- **[AGENTS.md](file:///c:/vscode/Musichub/AGENTS.md)**: ZEUS mandatory rules, frontend component structure, Git workflow, and documentation standards.
- **[docs/superpowers/specs/2026-11-18-frontend-linear-ui-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-18-frontend-linear-ui-design.md)**: Linear UI design specification, Pretendard typography, and Korean localization.
- **[docs/frontend-verification-guide.md](file:///c:/vscode/Musichub/docs/frontend-verification-guide.md)**: Frontend code style, braces discipline, and ESLint / Prettier verification rules.
- **[music-hub-project-plan.md](file:///c:/vscode/Musichub/music-hub-project-plan.md)**: Product specification, Cloud storage architecture, and MVP roadmap.

---

## UI & Design System

- **Aesthetic**: Linear-inspired dark mode interface (deep charcoal canvas `#08090a`, subtle 1px borders `border-white/[0.08]`, Linear violet `#5e6ad2` accents, frosted acrylic glassmorphism).
- **Typography**: Pretendard Variable with tabular figures (`tnum`) for jitter-free real-time audio time and storage displays.
- **Language**: Korean (`ko-KR`) by default across all screens, controls, and dialogs.

---

## Tech Stack

- **Frontend**: React, TanStack Router
- **Backend**: Spring Boot 3.x, Kotlin
- **Database**: PostgreSQL
- **Storage**: Cloud Storage (S3-compatible)
