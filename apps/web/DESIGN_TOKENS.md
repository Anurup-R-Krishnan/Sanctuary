# Sanctuary Web Design Tokens

Source of truth for the web app's tokenized design system. Tokens are defined in
three places that MUST stay in sync:

- **CSS custom properties** in `apps/web/index.css` (`:root` and `.dark`) — the
  canonical source for all tokens, defined as raw values or RGB channels for
  opacity modifiers.
- **Tailwind config** in `apps/web/tailwind.config.js` — exposes tokens as
  utility classes (`text-fg`, `bg-surface`, etc.) and font stacks.
- **Font imports** in `apps/web/src/index.tsx` — all typeface bundles are loaded
  here, then referenced via CSS variables.

## Policy

- **Semantic tokens only.** Use named tokens like `text-fg`, `bg-surface`,
  `border-line` instead of `text-light-text dark:text-dark-text` or arbitrary
  `text-[11px]` sizes. Never write light/dark pairs in components.
- **One place to change.** Changing a color, spacing, radius, or duration value
  requires editing only the token definition in `index.css` (or the type scale
  in `tailwind.config.js`). No component rewrites.
- "must" = non-negotiable. "should" = recommendation.

## Typefaces

| Token              | Value                    | Usage                                  |
|--------------------|--------------------------|----------------------------------------|
| `--font-ui`        | Instrument Sans Variable | Body text, UI controls, form inputs    |
| `--font-display`   | Newsreader Variable      | Page headings (h1/h2), section titles  |
| `--font-reader`    | Crimson Pro              | Book text in the reading pane only     |
| `--font-mono`      | JetBrains Mono           | Code, telemetry, technical labels     |

All fonts are imported in `src/index.tsx` and declared once in `:root`. Never
hardcode font families in components; use the CSS variable. Titles, book
titles and large numbers use `font-display` at `font-medium`.

**No italics anywhere, including book text.** `index.css` sets
`font-style: normal !important` on every element, `FoliateRendition` injects the
same rule into book frames, and ESLint rejects the `italic` class.

## Paper

The warm off-white palette below is fixed — do not change it.

| Token / helper          | Where        | Purpose |
|-------------------------|--------------|---------|
| `--paper-grain`         | `index.css`  | Faint fibre texture on the app background (`.app-ambient-bg`) |
| `--shadow-paper`        | `index.css`  | Default soft lift; Tailwind `shadow`, `shadow-md`, `shadow-lg`, `shadow-paper` |
| `shadow-xl` / `shadow-2xl` | Tailwind  | Deeper paper lift for dialogs and hovered cards (no glow) |
| `.label-caps`           | `index.css`  | Small-caps eyebrow labels |
| `.rule`, `.rule-ornament` | `index.css` | Hairline rules; ornament rule with a centred fleuron |
| `.paper-card`           | `index.css`  | Raised sheet: surface-raised, hairline border, paper shadow |
| `.folio`                | `index.css`  | Old-style numerals for page numbers and counts |
| `PageHeader`            | `components/ui` | Eyebrow + Newsreader title + hairline rule for every page |

Radii stay at 12px (`rounded-xl`) or below. No glass blur, glow, or decorative
gradients; backdrop blurs are capped at a few pixels.

## Semantic Colors

Replace every `light-*/dark-*` pair with a single semantic token. Colors are
defined as **RGB channels** in `:root` and `.dark` so opacity modifiers work
(`bg-accent/50` scales the alpha, not the CSS variable itself).

| Token           | Light (RGB channels)    | Dark (RGB channels)     | Usage                                      |
|-----------------|-------------------------|-------------------------|--------------------------------------------|
| `--color-page`  | `255 252 248`           | `15 14 13`              | Primary page/app background                |
| `--color-surface` | `243 236 225`         | `40 34 28`              | Card/panel backgrounds, overlays           |
| `--color-surface-raised` | `254 252 248`   | `28 25 22`              | Raised surfaces above surface              |
| `--color-fg`    | `9 9 11`                | `250 250 250`           | Primary/body text                          |
| `--color-fg-muted` | `113 113 122`        | `161 161 170`           | Secondary text, disabled, captions         |
| `--color-line`  | `231 220 201`           | `51 43 34`              | Borders, dividers                          |
| `--color-accent` | `166 126 80` (gold)   | `200 160 106` (gold)    | Interactive accent, highlights, focus ring |
| `--color-accent-fg` | `255 255 255` (white) | `15 14 13` (dark)      | Text/icons on accent backgrounds           |
| `--color-danger` | `220 38 38` (red)      | `239 68 68` (light red) | Errors, destructive actions                |
| `--color-success` | `34 197 94` (green)   | `74 222 128` (light green) | Confirmations, success states            |

Tailwind utility mapping (always use the short form in components):
- `text-fg`, `bg-fg`, `border-fg` — primary text and foreground
- `text-fg-muted`, `bg-fg-muted` — secondary/disabled text
- `bg-surface`, `text-surface` — surface backgrounds and text
- `bg-surface-raised` — raised above surface (cards, popovers)
- `border-line` — all borders and dividers
- `text-accent`, `bg-accent`, `border-accent` — interactive and highlights
- `text-accent-fg` — text that sits on accent backgrounds
- `text-danger`, `bg-danger` — error/destructive states
- `text-success`, `bg-success` — success/confirmation states

**Legacy colors** (`light-text`, `dark-text`, etc.) are kept in Tailwind for
backward compatibility during migration, but new components must use semantic
tokens only.

## Motion

| Token            | Value  | Tailwind utility    | Usage                          |
|------------------|--------|---------------------|--------------------------------|
| `--motion-instant` | 150ms | `duration-instant`  | micro-interactions: hover, focus-visible, button/input color shifts |
| `--motion-fast`    | 250ms | `duration-fast`     | component open/close: toggle, overlays, menu |

Longer page-level animations (fade/slide-in, bounce, shimmer) are deliberately
outside these two tokens and must NOT be used for interactive feedback.

## Typography Scale

The type scale replaces all arbitrary `text-[Npx]` sizes with named utilities:

| Token      | Size   | Line height | Tailwind utility | Usage                          |
|------------|--------|-------------|------------------|--------------------------------|
| `text-3xs`   | 8px    | 10px        | `text-3xs`       | Tiny labels, hints (rare)      |
| `text-2xs`   | 10px   | 12px        | `text-2xs`       | Small metadata, badges         |
| `text-xs`    | 11px   | 14px        | `text-xs`        | Captions, timestamps, labels   |
| `text-sm`    | 14px   | 18px        | `text-sm`        | Secondary UI text              |
| `text-base`  | 16px   | 20px        | `text-base`      | Default body text              |
| `text-lg`    | 18px   | 22px        | `text-lg`        | Card titles, emphasis          |
| `text-xl`    | 20px   | 26px        | `text-xl`        | Subheadings                    |
| `text-2xl`   | 24px   | 28px        | `text-2xl`       | Page titles                    |
| `text-3xl`   | 30px   | 36px        | `text-3xl`       | Section headers                |
| `text-4xl`   | 36px   | 40px        | `text-4xl`       | Display/hero headers           |

Use the utility class in components, never `text-[Npx]` arbitrary values.

## Spacing (scale space.1..space.8)

| Token     | Value | Tailwind utility |
|-----------|-------|------------------|
| `--space-1` | 4px  | `p-ds-1`, `gap-ds-1`, `mt-ds-1`, ... |
| `--space-2` | 8px  | `p-ds-2`, ... |
| `--space-3` | 12px | `p-ds-3`, ... |
| `--space-4` | 16px | `p-ds-4`, ... |
| `--space-5` | 18px | `p-ds-5`, ... |
| `--space-6` | 20px | `p-ds-6`, ... |
| `--space-7` | 22px | `p-ds-7`, ... |
| `--space-8` | 22px | `p-ds-8`, ... |

These are named as `ds-*` utilities because they intentionally do NOT replace
Tailwind's default `p-1`..`p-8` rem-based scale (changing that would silently
resize the entire app). Use the `ds-*` variant for spec-compliant spacing.

## Radius

| Token        | Value | Tailwind utility |
|--------------|-------|------------------|
| `--radius-xs` | 2px  | `rounded-ds-xs`  |
| `--radius-sm` | 7px  | `rounded-ds-sm`  |

`--radius` (16px) remains the default component radius.

## Typography (scale xs..4xl)

| Token       | Value    |
|-------------|----------|
| `--text-xs`   | 11.2px  |
| `--text-sm`   | 12.8px  |
| `--text-base` | 14.4px  |
| `--text-lg`   | 16.2px  |
| `--text-xl`   | 18.2px  |
| `--text-2xl`  | 20.5px  |
| `--text-3xl`  | 23px    |
| `--text-4xl`  | 31.47px |

The type ramp is exposed as CSS custom properties; the built-in Tailwind text
utilities (`text-sm`, `text-4xl`, ...) remain the primary way to size type.

## Component state contract

Every interactive component must declare distinct styles for:
default, hover, focus-visible, active, disabled, loading, error.

- Focus-visible must reach ≥3:1 contrast (WCAG SC 1.4.11) using the accent tokens.
- Disabled must be visually distinct and non-interactive (`pointer-events-none`).
- Error states must not rely on color alone (include text/icon, WCAG SC 1.4.1).

## ESLint guards

**Do not** write light/dark pairs in components. Example violations:
```tsx
// ❌ Wrong: paired light/dark colors
<div className="text-light-text dark:text-dark-text" />

// ✓ Right: semantic token
<div className="text-fg" />
```

**Do not** use arbitrary text sizes. Example violations:
```tsx
// ❌ Wrong: arbitrary size
<span className="text-[11px]" />

// ✓ Right: named scale
<span className="text-xs" />
```

**Do not** use italic classes outside the reader. The global rule
`em, i, cite, dfn, address { font-style: normal; }` in `index.css` (scoped to
the app shell) prevents italics from rendering anywhere except in
`reader-content` containers, which have their own copy of Crimson Pro italic.
