# `@workspace/ui`

Shared UI for the monorepo.

## Layout

| Path                     | Role                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/*`       | **shadcn/ui primitives** (Button, Card, Dialog, Sidebar, Chart, …). Building blocks.                                                                 |
| `src/components/ui/*`    | **Watermelon UI compositions** (heroes, pricing, portfolio dashboard, contact, …). Polished marketing & product blocks built _on top of_ primitives. |
| `src/blocks/*`           | Optional **shadcn block examples** for the CLI / reference.                                                                                          |
| `src/hooks/*`            | Shared hooks (e.g. `use-mobile`).                                                                                                                    |
| `src/lib/utils.ts`       | `cn()` helper.                                                                                                                                       |
| `src/styles/globals.css` | Design tokens + base styles.                                                                                                                         |

## How to use

**Primitives** (forms, layout, chrome):

```ts
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
```

**Watermelon compositions** (landing, dashboards):

```ts
import { Hero2 } from "@workspace/ui/components/ui/hero/hero-2";
import { PortfolioDashboard } from "@workspace/ui/components/ui/dashboards/portfolio-dashboard";
import { Web3Dashboard } from "@workspace/ui/components/ui/dashboards/web3-dashboard";
```

## Rules

1. Prefer **primitives** for new app chrome and forms.
2. Prefer **Watermelon blocks** for marketing sections and high-polish demo dashboards already in the kit.
3. New Watermelon-style blocks should compose primitives from `src/components/*` (not reimplement Button/Card).
4. **Icons:** Phosphor for primitives and Watermelon blocks; `react-icons` only for brand/social glyphs. No `lucide-react` or Hugeicons.
