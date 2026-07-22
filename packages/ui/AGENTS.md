## Icon Weight Guidelines

System-wide rules for selecting and switching icon weights to maintain visual hierarchy and UI clarity.

### 1. Core Weight Rules

- **Regular / Light:** Default UI standard. Use for baseline navigation, utility tools (search, settings, edit), and inline text components.
- **Bold:** Emphasis and alerts. Use to draw immediate attention to critical status changes, destructive actions, or high-priority notifications.
- **Thin:** Display only. Use strictly for large display elements or spacious dashboard cards. _Never use Thin at standard UI scales (16px–24px) due to legibility degradation._
- **Fill:** Interactive feedback. Use to indicate active selection, toggled states, or completed actions.
- **Duotone:** Rich interface accents. Use to incorporate branding or secondary opacity accents in dense feature matrices.

### 2. State & Interaction Mapping

When rendering interactive UI components, switch weights to communicate state changes to the user:

| UI Component                           | Inactive / Unselected State | Active / Selected State |
| :------------------------------------- | :-------------------------- | :---------------------- |
| **Navigation Tabs**                    | Regular / Light             | Fill                    |
| **Action Toggles (Favorite/Bookmark)** | Regular (Outline)           | Fill                    |
| **Dense Utility Actions**              | Regular                     | Bold                    |

### 3. Typography & Interface Alignment

- **Weight Matching:** Align icon stroke weight to the weight of adjacent text labels (e.g., pair light fonts with Light icons; medium/bold fonts with Regular/Bold icons).
- **Layout Stability:** Maintain static bounding boxes (e.g., fixed `24x24px` containers) across all weights to prevent layout shifts during state transitions.
- **Scale Unity:** Do not mix [Phosphor Icons](https://phosphoricons.com/) weights with secondary font libraries to prevent stroke and bounding box mismatches.

---

## Shadcn with Base UI Guidelines

This workspace uses a hybrid approach integrating **shadcn/ui** conventions and **Base UI** (configured as `"base": "base"`). Follow these rules to avoid Radix-only assumptions or standard shadcn/Radix-only conventions.

### 1. Component Composition Invariants

- **Trigger & Close Rendering:** Use the `render` prop instead of Radix `asChild`.

  ```tsx
  // Correct (Base UI)
  <DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>

  // Incorrect (Radix)
  <DialogTrigger asChild>...
  ```

  This applies to `DialogTrigger`, `SheetTrigger`, `AlertDialogTrigger`, `DropdownMenuTrigger`, `PopoverTrigger`, `TooltipTrigger`, `CollapsibleTrigger`, `DialogClose`, `SheetClose`, `NavigationMenuLink`, `BreadcrumbLink`, `SidebarMenuButton`, etc.

- **Non-Button Triggers:** When `render` changes a button to a non-button element (such as an `<a>` or `<span>`), you must pass `nativeButton={false}`.
  ```tsx
  // Correct
  <Button render={<a href="/docs" />} nativeButton={false}>
    Read the docs
  </Button>
  ```
- **Select Component:**
  - Base requires an `items` prop on the root `<Select>` component.
  - Define a placeholder using a `{ value: null }` item in the items array instead of `<SelectValue placeholder="...">`.
  - Use `alignItemWithTrigger={false}` on `<SelectContent>` instead of `position="popper"`.
- **ToggleGroup Component:** Use the `multiple` boolean prop instead of `type="single"|"multiple"`. The `defaultValue` or `value` must always be an array.
- **Slider Component:** Accept a plain number for a single thumb (e.g., `defaultValue={50}`) instead of wrapping it in an array (e.g., `[50]`).
- **Accordion Component:** Do not use `type` or `collapsible` props. Instead, use the `multiple` boolean prop, and pass `defaultValue` as an array (e.g., `defaultValue={["item-1"]}`).

### 2. Styling & Layout Standards (Tailwind CSS v4)

- **Layout Spacing:** Use Flexbox layouts with explicit gap properties (`flex flex-col gap-3`) instead of utility space classes (`space-y-3` / `space-x-3`).
- **Equal Dimensions:** Prefer the `size-*` utility instead of `w-* h-*` when width and height are equal (e.g. `size-10`).
- **Z-Index Overrides:** Do not set manual z-index values on overlay components (Dialog, Popover, Sheet, Tooltip, etc.); let the primitives handle their own stacking context.
- **Conditional Class Names:** Always use the `cn()` utility from `@workspace/ui/lib/utils` to merge or conditionally apply class names.

### 3. Monorepo Structural Rules

- **Component Layers:**
  - `src/components/*` contains **shadcn/ui primitives** (Button, Card, Dialog, Sidebar). Respect and preserve their default implementations (they should hardly be changed). Instead, adjust components, compositions, and call-sites using the primitives.
  - `src/components/ui/*` contains **Watermelon UI compositions** (pre-built marketing sections, dashboard cards). Compose new Watermelon components strictly by importing from `src/components/*`.
  - `src/blocks/*` contains **blocks** (larger pre-built page layouts/modules like dashboard, login, sidebar, or the UI showcase/preview under `src/blocks/preview`).
- **Icon Library:** Strictly use **Phosphor Icons** (`@phosphor-icons/react`) for UI actions and states, and **react-icons** ONLY for brand/social icons. Do not import `lucide-react` or Hugeicons.
