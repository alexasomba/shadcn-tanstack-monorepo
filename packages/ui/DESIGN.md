# `@workspace/ui` Design System Documentation

A comprehensive guide to the design system, styling structures, and aesthetic tokens used across the monorepo workspace.

---

## 1. Core Principles & Philosophy

Our UI aims to deliver a modern, premium, and highly responsive experience. Every component should feel alive and visually polished:

- **Rich Aesthetics:** Leverage subtle gradients, clean borders, dynamic hover responses, and glassmorphism.
- **Strict Semantics:** Design is driven by semantic design tokens (e.g. `text-muted-foreground`) rather than arbitrary, layout-bound color utilities.
- **Performance & Standard:** Fast page rendering, optimized layout containment, and no layout shifts during interactive actions.

---

## 2. Typography

We use modern typography built around variable font systems to maintain readability and legibility at all device scales.

### Font Contract

The workspace maps typography to the following custom properties:

| CSS Custom Variable | Font Family                        | Usage                                                  |
| :------------------ | :--------------------------------- | :----------------------------------------------------- |
| `--font-sans`       | `"DM Sans Variable"`, `sans-serif` | Default UI elements, body text, buttons, form controls |
| `--font-heading`    | Inherits from `--font-sans`        | Titles, section headers, card titles, hero elements    |

---

## 3. Color System (OKLCH)

We use **OKLCH** colors to maintain uniform perceptual lightness and chrome variance. Color values are defined semantically and shift automatically between light and dark modes.

### Light Mode Values

- `--background`: `oklch(1 0 0)` (White)
- `--foreground`: `oklch(0.145 0 0)` (Dark Charcoal)
- `--primary`: `oklch(0.205 0 0)`
- `--primary-foreground`: `oklch(0.985 0 0)`
- `--secondary` & `--muted`: `oklch(0.97 0 0)`
- `--secondary-foreground`: `oklch(0.205 0 0)`
- `--muted-foreground`: `oklch(0.556 0 0)`
- `--destructive`: `oklch(0.577 0.245 27.325)` (Crimson Red)
- `--border` & `--input`: `oklch(0.922 0 0)`

### Dark Mode Values

- `--background`: `oklch(0.145 0 0)` (Dark Charcoal)
- `--foreground`: `oklch(0.985 0 0)` (Soft Off-White)
- `--card` & `--popover`: `oklch(0.205 0 0)`
- `--primary`: `oklch(0.922 0 0)`
- `--primary-foreground`: `oklch(0.205 0 0)`
- `--secondary` & `--muted`: `oklch(0.269 0 0)`
- `--secondary-foreground`: `oklch(0.985 0 0)`
- `--muted-foreground`: `oklch(0.708 0 0)`
- `--destructive`: `oklch(0.704 0.191 22.216)` (Rich Dark Red)
- `--border`: `oklch(1 0 0 / 10%)`
- `--input`: `oklch(1 0 0 / 15%)`

---

## 4. Layout & Spacing Systems

Layouts should be defined statically and remain highly responsive.

- **Flex & Grid:** Lay out components using Flexbox/Grid structures with explicit gap properties (`flex flex-col gap-4` or `grid gap-6`). Avoid legacy `space-y-*` or `space-x-*` utilities.
- **Aspect Ratio & Sizing:** Use the square aspect utility (`size-10`) when height and width values are equal.
- **Borders:** Use the semantic `border-border` and inherit styles when nested. Always define outline states for interactive items via `outline-ring/50`.

---

## 5. Components Architecture

The shared UI package is divided into two distinct architectural layers:

### Primitives (`src/components/*`)

The basic building blocks of application chrome, forms, and overlays (e.g. `Button`, `Card`, `Dialog`, `Select`).

- Primitives are built using **Shadcn** conventions on top of **Base UI** hooks/primitives.
- They are unopinionated, flexible, and serve as the foundation for the entire workspace.

### Watermelon Compositions (`src/components/ui/*`)

High-polish marketing blocks, complex analytics widgets, and portfolio dashboard structures.

- Compositions are polished, feature-complete sections (e.g., pricing tables, hero banners, feature grids).
- Compositions **must** compose Primitives directly and avoid styling raw HTML tags from scratch.

---

## 6. Icon Guidelines

To keep the UI consistent and weight matching intact, follow the rules listed in [AGENTS.md](./AGENTS.md):

- Use **Phosphor Icons** (`@phosphor-icons/react`) for standard UI controls, navigation, and state shifts.
- Use **react-icons** ONLY for brand/social logos (e.g. GitHub, Google, Twitter).
- Do not introduce `lucide-react`, Hugeicons, or other external icon libraries.
