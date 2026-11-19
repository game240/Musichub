# frontend-verification-guide.md

# Frontend Code Style (braces + formatting)

Translation hints (Korean glossary):

| English | Korean |
| :--- | :--- |
| control statement | 제어문 ( `if` / `else` / `for` / `while` / `try` ) |
| braces | 중괄호 (`{ }`) |
| brace-less body | 괄호 생략 (예: `if (x) return;`) |
| formatting | 포맷팅 — 들여쓰기·줄바꿈·따옴표 같은 공백 규칙 |
| line ending (LF) | Prettier 설정 LF |
| formatting debt | 포맷 부채 — 규칙 제정 전에 만들어진 코드에 남은 위반 |

The one rule people ask about: **no brace-less control statements, and no body on the same line as the condition.** This file is the single source of truth for that rule and for who enforces it. Verification order lives in `docs/frontend-verification-guide.md` §0.

## 1. Braces are mandatory, body always on its own line

Applies to `if` / `else if` / `else` / `for` / `for-of` / `while` / `do` / `try` / `catch` / `finally`, including the ones that look obvious in one line.

```typescript
// do this
if (!sn) {
  return dash;
}

for (const row of rows) {
  total += row.score;
}

// never this — brace-less body
if (!sn) return dash;

// never this — body on the same line as the condition
if (!sn) {
  return dash;
}
if (rows.length > 0) {
  return rows;
}
```

Ternaries and `&&` early returns stay allowed as an expression-level choice (`sn ? sn : dash`); this rule is about statements only.

## 2. Who enforces what

| Layer | Config | Catches | Repairs |
| :--- | :--- | :--- | :--- |
| ESLint curly rule | `frontend/eslint.config.js` — `curly: ['error', 'all']` | brace-less control statements (error) | `pnpm exec eslint . --fix` |
| Prettier | `frontend/.prettierrc` | same-line bodies, line width, quotes, semicolons, trailing commas | `pnpm format` |

ESLint alone does not reject a one-line block (`if (!sn) { return dash; }` passes `curly`), and Prettier alone does not add missing braces — so both are needed. That is why `pnpm lint` and `pnpm format:check` are separate checks.

## 3. Formatting is Prettier's job, not the author's

Settings: `printWidth: 100`, `singleQuote`, `semi`, `trailingComma: "all"`, `arrowParens: "always"`, `endOfLine: "lf"`.

- Do not hand-format to match a neighbour file — run `pnpm format` (or format the changed file only) and accept the output.
- Do not add ESLint formatting rules; `eslint-config-prettier` is already last in the config to switch off anything that would fight Prettier.

## 4. Scope

- Covers `frontend/**/*.{ts,tsx}` — that is what ESLint and Prettier read.
- The Spring Boot backend (`src/main/java`, `src/main/resources`) and the legacy WebContent/ JS (jQuery 1.10, etc.) have no equivalent linter. Apply the same brace discipline by hand in new code there, and do not bulk-reformat legacy files while touching them.
