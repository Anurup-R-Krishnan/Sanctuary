# Sanctuary Web Design Tokens

Source of truth for the web app's tokenized design system. Tokens are defined in
two places that MUST stay in sync:

- **CSS custom properties** in `apps/web/index.css` (`:root`) — used directly by
  components and raw CSS.
- **Tailwind config extensions** in `apps/web/tailwind.config.js` — expose the same
  values as utility classes (prefixed `ds-` where they would otherwise collide with
  Tailwind's default rem-based scale).

## Policy

- Semantic tokens over raw hex/arbitrary values. If a component needs a color,
  spacing, radius, or duration, it uses a token, never a one-off literal.
- No one-off spacing, typography, radius, or motion exceptions. Add a token rather
  than hard-coding a value.
- "must" = non-negotiable. "should" = recommendation.

## Motion

| Token            | Value  | Tailwind utility    | Usage                          |
|------------------|--------|---------------------|--------------------------------|
| `--motion-instant` | 150ms | `duration-instant`  | micro-interactions: hover, focus-visible, button/input color shifts |
| `--motion-fast`    | 160ms | `duration-fast`     | component open/close: toggle, overlays, menu |

Longer page-level animations (fade/slide-in, bounce, shimmer) are deliberately
outside these two tokens and must NOT be used for interactive feedback.

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
