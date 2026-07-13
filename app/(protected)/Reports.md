# Pool Buyout Frontend Design System Guide

This guide documents the visual system used in this frontend so it can be copied into another existing project with minimal interpretation. It is based on the current source code, not a generic design-system rewrite.

## 1. Design Identity

The product is an operational banking dashboard for pool buyout, applications, batch processing, BRE, and document handling. The UI should feel compact, task-focused, and data-dense.

Core visual traits:

- White work surfaces on a warm orange-tinted app background.
- Orange is the primary action and active-state color.
- Blue is used as a secondary/information color, especially for application date filters, table titles, older dashboard modules, and document section accents.
- Slate/gray text carries most readable hierarchy.
- Tables are compact and centered where possible.
- Cards and modals use subtle borders and light shadows, not heavy decorative styling.
- Icons are used heavily in navigation and buttons.
- Most screens are desktop-first. Mobile is blocked in `App.tsx`.

Main brand signal:

- App logo: `public/images/pool-logo.png`
- Footer/powered-by logo in sidebar: `public/images/bstl_logo.png`
- Sidebar icons: `public/images/icons/sidebar/*.svg`
- Feature icons: `public/images/icons/*.svg`

## 2. Technology Stack

Use this stack to reproduce the UI closely:

```json
{
  "react": "^19.0.0",
  "react-router-dom": "^7.5.0",
  "tailwindcss": "^4.1.4",
  "@tailwindcss/vite": "^4.1.4",
  "tw-animate-css": "^1.2.5",
  "@radix-ui/react-dialog": "^1.1.6",
  "@radix-ui/react-select": "^2.1.6",
  "@radix-ui/react-popover": "^1.1.6",
  "@radix-ui/react-tabs": "^1.1.3",
  "@radix-ui/react-progress": "^1.1.2",
  "@tanstack/react-table": "^8.21.3",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.2.0",
  "lucide-react": "^0.488.0",
  "react-day-picker": "^8.10.1",
  "date-fns": "^3.6.0",
  "sonner": "^2.0.7"
}
```

Vite setup:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

The `@` alias is used throughout the component layer and should be preserved.

## 3. Global CSS Bootstrapping

Source: `src/App.css`

Current imports:

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap');
@import "tailwindcss";
@import "tw-animate-css";
```

Current body:

```css
body {
  background: #fde8de;
  font-family: 'Poppins', sans-serif;
}
```

Important precision note:

- `body` uses `Poppins`, but `App.css` imports Manrope and Roboto, not Poppins.
- To reproduce the intended design in a new project, import Poppins explicitly or change body to Manrope.
- If keeping the current intended look, use:

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
```

Global scrollbar behavior:

```css
* {
  scrollbar-width: none !important;
}

*::-webkit-scrollbar {
  display: none !important;
}

.scroll-container {
  overflow-y: scroll;
  scrollbar-width: none !important;
}

.scroll-container::-webkit-scrollbar {
  display: none !important;
}
```

The app intentionally hides scrollbars globally. If porting to a project that requires visible scrollbars for accessibility or table affordance, remove this global rule and hide scrollbars only on specific panels.

Tailwind v4 theme bridge:

```css
@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}
```

Base token defaults are shadcn-style OKLCH neutrals. Product-specific colors are mostly explicit hex Tailwind arbitrary values inside components.

## 4. Color System

### 4.1 Primary Orange System

Use orange for primary actions, active sidebar items, selected filter nav items, progress bars, file upload active state, selected pills, and positive workflow progression.

| Token Role | Hex | Usage |
|---|---:|---|
| Primary orange | `#f36723` | Buttons, active nav, progress, icons, main action text |
| Primary orange hover | `#d95a1f` | Filled button hover |
| Strong orange hover | `#e9541b` | Upload submit hover |
| Upload orange | `#ff5f1f` | Upload document submit and required mark |
| Bright process orange | `#ff6b1a` | Document workflow active step |
| Soft orange fill | `#fde8de` | Active nav background, secondary buttons, search inputs |
| Softer orange hover | `#ffe2d3` | Secondary button hover |
| Pale orange panel | `#fff4ec` | Selected modal nav, API panels, drag active state |
| Warm panel | `#fffaf6` | API panels, upload idle zone |
| Orange border | `#f3b38f` | API cards, upload idle borders |
| Pale orange border | `#fde0ce` | API table/cards separator |
| Brown-orange text | `#c24f12`, `#9f3f08`, `#7a4a2f`, `#b94816` | API labels, role badge |

Primary action recipe:

```tsx
className="bg-[#f36723] text-white hover:bg-[#d95a1f]"
```

Secondary orange outline/fill recipe:

```tsx
className="border-[#f36723] bg-[#fde8de] text-[#f36723] hover:bg-[#ffe2d3]"
```

Soft selected state:

```tsx
className="border-[#f36723] bg-[#fff4ec] text-[#f36723]"
```

### 4.2 Secondary Blue System

Use blue for informational or secondary emphasis, not primary workflow actions.

| Token Role | Hex | Usage |
|---|---:|---|
| Product blue | `#0089CF` | Document section headings, legacy buttons |
| Date picker blue | `#0389CC` | Application date presets and selected range |
| Deep blue | `#0A4DA2` | Batch list title, secondary icon buttons |
| Link/action blue | `#007BC3` | API GET badge, detail card icons |
| Legacy blue | `#0B5FFF`, `#00ADEF`, `#1B4E9B` | Reports/user-management legacy pages |
| Light blue fill | `#F0F9FF`, `#E6F4FB`, `#EBF8FF`, `#EEF7FF`, `#D1E9FF`, `#C3EEFF` | Date range middle, table borders, info cards |
| Info border | `#93c5fd` | Upload document note |
| Info text | `#2563eb` | Upload document note |

Date picker selected state:

```tsx
day_selected: "bg-[#0389CC] text-white hover:bg-[#0378b2] focus:bg-[#0389CC] focus:text-white"
day_range_middle: "aria-selected:bg-[#E6F4FB] aria-selected:text-[#0389CC] rounded-none"
```

### 4.3 Neutral System

Use slate and gray for the bulk of the interface.

| Token Role | Hex/Class | Usage |
|---|---|---|
| Near-black headings | `#0f172a`, `slate-950` | Dialog titles, key headings |
| Dark navy text | `#1D2D3E`, `#1f2a44` | API titles, document headings |
| Body text | `#334155`, `#475569`, `#62748E`, `#64748b` | Labels, summaries, secondary text |
| Muted icon/text | `#94a3b8`, `#9CA3AF` | Placeholder and low emphasis |
| Borders | `#d8deea`, `#dbe3ef`, `#e8edf5`, `#e2e8f0`, `#D1E9FF` | Dialog, inputs, table containers |
| Background | `#fde8de` | App body background |
| Surface | `#ffffff` | Cards, modals, sidebar, header |
| Soft surface | `#f8fafc`, `#fbfcfe`, `#f1f5f9` | Hover surfaces, upload panels |

### 4.4 Semantic Colors

| Meaning | Hex/Class | Usage |
|---|---|---|
| Success | `#16a34a`, `#22c55e`, `#dcfce7`, `emerald-*` | Approved document, file ready |
| Warning | `#f59e0b`, `#d97706`, `#fef3c7` | Under review document |
| Error | `#ef4444`, `#EA4335`, `#B91C1C`, `red-*` | Rejected, failed processing |
| Purple | `#7c3aed`, `#6d28d9`, `#f8f5ff` | Mortgage document category only |

Avoid making purple a system color. Recent sampling modal work intentionally moved from purple/violet to orange.

## 5. Typography

Global intended font:

```css
font-family: 'Poppins', sans-serif;
```

Fallback currently in imported CSS:

- Manrope
- Roboto

Type scale used in components:

| Use | Classes |
|---|---|
| Page title | `text-2xl font-bold` |
| Card/table title | `text-lg font-bold` or `text-lg font-semibold` |
| Dialog title | `text-lg font-semibold text-slate-950` |
| Section heading | `text-sm font-semibold`, `text-[13px] font-bold uppercase tracking-wider` |
| Table header | shared default `text-[16px] font-bold`, often overridden to `text-sm font-bold` |
| Table cell | shared default `text-[16px] font-medium`, often overridden to `text-sm` |
| Compact label | `text-[11px] font-semibold text-[#64748b]` |
| Helper text | `text-xs`, `text-sm text-slate-500` |

Rules for copying:

- Keep form and dense table labels at `11px` to `13px`.
- Keep operational tables at `text-sm` after overriding shared table defaults.
- Do not use hero typography inside dashboard cards.
- Letter spacing is usually normal. Uppercase labels use small positive tracking, for example `tracking-wider` or `tracking-[0.02em]`.

## 6. Spacing, Radius, and Shadow

Global radius token:

```css
:root {
  --radius: 0.625rem;
}
```

Common layout spacing:

| Pattern | Classes |
|---|---|
| Page wrapper | `p-3`, `space-y-4`, `min-h-screen` |
| Card padding | `p-3`, `p-4`, `p-5` |
| Toolbar gap | `gap-2`, `gap-4` |
| Form field gap | `space-y-1.5`, `space-y-4` |
| Table cell padding | shared `p-2` |
| Dialog header/footer | `px-6 py-5`, `px-6 py-4` |

Radius patterns:

| Element | Radius |
|---|---|
| Buttons | `rounded-sm`, sometimes `rounded-md` |
| Cards | `rounded-lg` or shared `rounded-xl` |
| Sidebar nav | `rounded-md` |
| Inputs/selects | `rounded-md` |
| Dialog | `rounded-lg`, sampling modal `rounded-xl` |
| Badges/pills | `rounded-md` or `rounded-full` |
| Pagination | `rounded-md` |

Shadow patterns:

| Element | Shadow |
|---|---|
| Sidebar | `shadow-xl` |
| Header | `shadow-[2px_2px_#f36723]` |
| Cards | `shadow-sm` |
| Dialogs | `shadow-lg`, sampling modal `shadow-2xl` |
| Profile modal | `shadow-xl` |
| Active sidebar item | `shadow-[0_0_15px_#fde8de]` |

## 7. App Shell

Sources:

- `src/components/Layout.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Header.tsx`
- `src/lib/constants/sidebar.ts`

### 7.1 Layout

Structure:

```tsx
<div className="min-h-screen flex">
  <Sidebar />
  <div className="flex-1 flex flex-col">
    <Header />
    <main>{children}</main>
  </div>
</div>
```

The current `main` has `className="bg-#fde8de-100"`, which is not a valid Tailwind class. The visible background still comes from `body { background: #fde8de; }`.

When porting, prefer:

```tsx
<main className="min-h-[calc(100vh-64px)] bg-[#fde8de]">
  {children}
</main>
```

### 7.2 Sidebar

Sidebar dimensions:

```tsx
className="
  sticky top-0 h-screen min-w-64 bg-white
  shadow-[0_2px_0_rgba(0,0,0,0.05)] shadow-xl
  flex flex-col p-2
"
```

Logo:

```tsx
<img
  src={assetPath("/images/pool-logo.png")}
  className="w-[180px] h-[50px] object-contain object-center ml-2"
/>
<hr className="w-3/4 border-t-2 border-[#f36723] mt-2 ml-2" />
```

Nav item:

```tsx
className={`group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
  isActive
    ? "bg-[#fde8de] text-[#f36723] font-semibold shadow-[0_0_15px_#fde8de]"
    : "text-gray-700 hover:bg-[#fde8de] hover:text-[#f36723] hover:font-semibold"
}`}
```

Icon rendering:

- Icons are SVG masks.
- The element uses `bg-current`, so the icon inherits text color.
- Active and hover states automatically recolor the masked SVG.

```tsx
<span
  className="h-5 w-5 shrink-0 bg-current transition-transform duration-200 group-hover:scale-105"
  style={{
    WebkitMaskImage: `url(${icon})`,
    maskImage: `url(${icon})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  }}
/>
```

Sidebar footer:

```tsx
<div className="mt-6 text-center text-sm text-gray-500 flex flex-col items-center">
  <p>Proudly Powered by</p>
  <img src={assetPath("/images/bstl_logo.png")} className="w-40 h-auto mb-2" />
</div>
```

### 7.3 Header

Header:

```tsx
<header className="sticky top-0 z-50 bg-white shadow-[2px_2px_#f36723]">
  <nav className="flex items-center justify-between py-3">
    ...
  </nav>
</header>
```

Header content:

- Left side: NBFC select.
- Right side: user icon opens `ProfileModal`.
- The header is compact and sticky.

### 7.4 Profile Modal

Source: `src/components/ProfileModal.tsx`

Panel:

```tsx
className="fixed z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
```

Top accent:

```tsx
<div className="h-1 bg-[#f36723]" />
```

Header gradient:

```tsx
className="border-b border-slate-100 bg-gradient-to-br from-white via-[#fff8f3] to-[#eef7ff] px-5 py-4"
```

Footer actions:

- Reset Password: white, slate border, blue hover.
- Logout: white, red border/text hover.

## 8. Shared Utility Layer

Source: `src/lib/utils.ts`

Required helpers:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function assetPath(path: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/*$/, "/");
  return `${base}${path.replace(/^\//, "")}`;
}
```

Copy `cn` and `assetPath` first. Many components depend on both.

CSV export helper:

```ts
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

## 9. Shared UI Primitives

The app uses shadcn-style primitives under `src/components/ui`.

Minimum set to copy:

- `button.tsx`
- `card.tsx`
- `input.tsx`
- `textarea.tsx`
- `select.tsx`
- `dialog.tsx`
- `table.tsx`
- `pagination.tsx`
- `dropdown-menu.tsx`
- `popover.tsx`
- `calendar.tsx`
- `tabs.tsx`
- `progress.tsx`
- `badge.tsx`
- `skeleton.tsx`
- `skeleton-table.tsx`

### 9.1 Button

Source: `src/components/ui/button.tsx`

Base:

```tsx
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
```

Variants:

```tsx
default: "border border-[#f36723] bg-white text-[#f36723] hover:bg-[#fde8de]"
destructive: "border border-[#f36723] bg-white text-[#f36723] shadow-xs hover:bg-[#fde8de] focus-visible:ring-[#f36723]/20"
outline: "border border-[#f36723] bg-white text-[#f36723] shadow-xs hover:bg-[#fde8de] hover:text-[#f36723]"
secondary: "bg-[#fde8de] text-[#f36723] shadow-xs hover:bg-[#ffe2d3]"
ghost: "text-[#f36723] hover:bg-[#fde8de] hover:text-[#d85a1e]"
link: "text-[#f36723] underline-offset-4 hover:underline"
blue: "border border-[#f36723] bg-white text-[#f36723] shadow-xs hover:bg-[#fde8de] focus-visible:ring-2 focus-visible:ring-[#f36723]/40"
```

Precision note:

- The `blue` variant is actually orange. Treat it as a legacy alias.
- For filled primary buttons, components override with `bg-[#f36723] text-white hover:bg-[#d95a1f]`.

Button sizes:

```tsx
default: "h-9 px-4 py-2"
sm: "h-8 rounded-md gap-1.5 px-3"
lg: "h-10 rounded-md px-6"
icon: "size-9"
```

### 9.2 Card

Source: `src/components/ui/card.tsx`

Base:

```tsx
"bg-card text-card-foreground flex flex-col gap-2 rounded-xl border py-3 shadow-sm"
```

Most feature cards override padding:

```tsx
<Card className="p-3">
<div className="bg-white shadow-sm rounded-lg p-5">
```

Use white cards with `shadow-sm`. Avoid nested cards unless the inner unit is a repeated item.

### 9.3 Input and Textarea

Input base:

```tsx
"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm"
```

Common overrides:

```tsx
className="bg-[#fde8de] border border-[#f36723] text-sm w-[240px] focus-visible:ring-0 focus-visible:ring-offset-0"
className="border border-[#f3b38f] bg-[#fff4ec] text-sm w-[260px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#f3b38f]"
className="h-9 rounded-md border-[#dbe3ef] text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
```

Textarea base:

```tsx
"border-input placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none md:text-sm"
```

Dense textarea override:

```tsx
className="min-h-[90px] resize-none rounded-md border-[#dbe3ef] text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
```

### 9.4 Select

Source: `src/components/ui/select.tsx`

Trigger base:

```tsx
"border-input data-[placeholder]:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none data-[size=default]:h-9 data-[size=sm]:h-8"
```

Dense modal select:

```tsx
className="h-10 rounded-md border-[#d8deea] bg-white text-sm"
```

### 9.5 Dialog

Source: `src/components/ui/dialog.tsx`

Overlay:

```tsx
"fixed inset-0 z-50 bg-black/50"
```

Base content:

```tsx
"bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-3 shadow-lg duration-200 sm:max-w-lg"
```

Sampling modal override:

```tsx
className="w-[min(860px,calc(100vw-2rem))] max-w-[860px] gap-0 overflow-hidden rounded-xl border border-[#d8deea] bg-white p-0 shadow-2xl sm:max-w-[860px]"
```

### 9.6 Table

Source: `src/components/ui/table.tsx`

Container:

```tsx
<div className="relative w-full overflow-x-auto">
```

Base table:

```tsx
"w-full caption-bottom text-sm"
```

Header:

```tsx
"h-10 px-2 text-left align-middle whitespace-nowrap text-[16px] text-[#222222] font-bold"
```

Cell:

```tsx
"p-2 align-middle whitespace-nowrap text-[16px] font-medium space-x-2"
```

Most feature tables override to `text-sm` or `text-xs`.

Table design rules:

- Header row uses bottom border only.
- Rows use hover `hover:bg-muted/50`.
- Data cells commonly use `text-center`.
- Dense application tables use `truncate max-w-[200px]`.
- Avoid horizontal scroll by reducing columns and using fixed/centered spacing where applicable.

### 9.7 Pagination

Source: `src/components/ui/pagination.tsx`

Container:

```tsx
"mx-auto flex w-full justify-end"
```

Page link:

```tsx
"flex items-center justify-center w-8 h-8 rounded-md border text-sm transition-colors"
```

Active:

```tsx
"bg-[#f36723] text-white border-[#f36723] hover:bg-[#f36723] hover:text-white"
```

Inactive:

```tsx
"bg-white text-gray-700 border-gray-300 hover:bg-[#fde8de] hover:text-[#f36723] hover:border-[#f36723]"
```

### 9.8 Progress

Source: `src/components/ui/progress.tsx`

```tsx
<ProgressPrimitive.Root className="relative h-1 w-full rounded-full overflow-hidden bg-[#fde8de]">
  <ProgressPrimitive.Indicator className="bg-[#f36723] h-full w-full flex-1 transition-all" />
</ProgressPrimitive.Root>
```

Use orange progress indicators for workflow state.

### 9.9 Badge

Source: `src/components/ui/badge.tsx`

Base:

```tsx
"inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 overflow-hidden"
```

Current custom badge variants are weakly named. For precise porting, create explicit variants:

```tsx
orange: "border-[#f3b38f] bg-[#fff4ec] text-[#c24f12]"
warning: "border-transparent bg-[#FFEAB6] text-[#A26811]"
success: "border-green-200 bg-green-100 text-green-800"
info: "border-[#D1E9FF] bg-[#F0F9FF] text-[#007BC3]"
```

## 10. Tables and Data Lists

### 10.1 Loan Application List

Source: `src/components/ui/data-table.tsx`

Wrapper:

```tsx
<div className="bg-white shadow-sm rounded-lg mb-4">
```

Toolbar:

```tsx
<div className="flex items-center justify-between p-2 border-b-[#C3EEFF] border-b-2">
  <h2 className="ml-4 text-lg font-bold text-[#62748E]">Loan Application List</h2>
  <div className="flex items-center gap-2">...</div>
</div>
```

Search:

```tsx
<Input
  className="bg-[#fde8de] border border-[#f36723] text-sm w-[240px] focus-visible:ring-0 focus-visible:ring-offset-0"
/>
```

Sort/filter icon buttons:

```tsx
className="text-[#0A4DA2] border-none p-0 hover:text-[#0A4DA2]/80 hover:bg-white"
```

Table border:

```tsx
<div className="border border-[#D1E9FF]">
```

Action button:

```tsx
className="text-[#f36723] border-[#f36723] bg-[#fde8de] hover:bg-[#ffe2d3]"
```

Loan table columns:

- SL
- LAN
- Customer
- Product
- Sanction Amt
- Purchase Amt
- OS Balance
- DPD
- BRE Status
- Action

### 10.2 Batch List Table

Source: `src/components/ui/PoolBatchListTable.tsx`

Wrapper:

```tsx
<div className="bg-white shadow-sm rounded-lg mb-4">
```

Toolbar:

```tsx
<div className="flex items-center justify-between p-3 border-b border-[#fde8de]">
  <h2 className="text-lg font-bold text-[#0A4DA2]">Batch List</h2>
</div>
```

Search:

```tsx
className="border border-[#f3b38f] bg-[#fff4ec] text-sm w-[260px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#f3b38f]"
```

Download CSV button:

```tsx
className="gap-2 text-[#f36723] border-[#f36723] bg-[#fde8de] hover:bg-[#ffe2d3]"
```

Batch table columns:

- SL
- Pool Batch ID
- Partner
- Pool Name
- Total Apps
- Sanction Amount
- Purchase Amount
- OS Balance
- Status
- Created On
- Action

## 11. Applications Tab

Sources:

- `src/components/Application/Application.tsx`
- `src/components/Application/PendingApplications.tsx`
- `src/components/Application/ApplicationRoutes.tsx`

Page wrapper:

```tsx
<div className="flex flex-col space-y-4 p-3">
```

Header:

```tsx
<h2 className="text-2xl font-bold">Applications</h2>
<p className="text-gray-600">List of Applications</p>
```

Filter/search card:

```tsx
<Card className="p-3">
  <CardContent>
    <div className="flex flex-wrap items-center gap-4">
```

Search field:

```tsx
<div className="flex-1 relative min-w-[240px]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
  <Input className="pl-10" />
</div>
```

Status select:

```tsx
<SelectTrigger className="w-[180px]">
```

Date picker button:

```tsx
className="w-[280px] justify-start border-gray text-left font-normal h-10"
```

Date popover:

```tsx
className="w-auto p-0 flex flex-col bg-white shadow-2xl border-none rounded-sm"
```

Date preset sidebar:

```tsx
className="flex flex-col w-[160px] border-r bg-gray-50/50"
```

Active preset:

```tsx
"bg-[#0389CC] text-white hover:bg-[#0378b2]"
```

Footer actions:

- Clear All: neutral outline.
- Export CSV: shared `Button` default unless loading.

Application list table:

- Uses `Card`.
- Table wrapper: `overflow-x-auto`.
- Table class: `!text-xs`.
- Visible columns:
  - Lead ID header is currently rendered but cell shows `lan_account_number`.
  - Customer
  - Sanction
  - Status
  - Created At
  - Actions

## 12. Buyout File Upload

Source: `src/components/Upload Pool File/DisbursementFileUpload.tsx`

Page wrapper:

```tsx
<div className="flex flex-col space-y-4 p-3">
```

Card:

```tsx
<div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
```

Top action:

```tsx
className="flex cursor-pointer items-center gap-1 rounded-sm border-[#f36723] bg-white text-[#f36723] transition-colors hover:bg-[#f36723] hover:text-white"
```

Upload zone:

```tsx
className="flex w-full max-w-3xl cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-8 text-center transition"
```

Upload zone states:

```tsx
isDragActive:
"border-[#f36723] bg-[#fff4ec] shadow-[0_0_0_4px_rgba(243,103,35,0.12)]"

selectedFile:
"border-emerald-300 bg-emerald-50/60"

idle:
"border-[#f3b38f] bg-[#fffaf6] hover:border-[#f36723] hover:bg-[#fff4ec]"
```

Icon tile:

```tsx
selectedFile ? "bg-emerald-100 text-emerald-700" : "bg-white text-[#f36723]"
```

Primary browse:

```tsx
className="rounded-sm bg-[#f36723] text-white hover:bg-[#d95a1f]"
```

Submit:

```tsx
className="rounded-sm bg-blue-500 p-5 text-lg text-white hover:bg-blue-600"
```

Precision note:

- The final `Next` button is blue, while the rest of the upload flow is orange. If unifying the system, convert this to orange.

## 13. Buyout File Rundown and BRE Process

Source: `src/components/Upload Pool File/DisbursementFileRundown.tsx`

This is one of the most important flows to copy accurately.

### 13.1 Stage Memory

The flow stores stage progress per tranche in localStorage:

```ts
type PersistedRundownStage = {
  scrutinized?: boolean;
  docMapped?: boolean;
  breRequested?: boolean;
};

const RUNDOWN_STAGE_STORAGE_PREFIX = "pool-buyout-rundown-stage:";
```

Storage key:

```ts
`pool-buyout-rundown-stage:${trancheId}`
```

Behavior:

- Returning backward/forward should not restart the process.
- Scrutinize completion persists.
- Doc Mapping completion persists.
- BRE request state persists.
- If tranche status implies BRE has already run, UI resumes from BRE stage.

### 13.2 Rundown Card

Outer page:

```tsx
<div className="flex flex-col space-y-4 p-3">
```

Main card:

```tsx
<div className="flex flex-col bg-white shadow-sm rounded-lg p-5 space-y-3 space-x-4">
```

Header text:

```tsx
className="flex space-x-2 text-sm text-[#62748E]"
```

Stage strip:

```tsx
<span className="flex justify-between space-x-2 p-5 ml-5 mr-5">
```

The current stage strip uses fixed widths and negative margins around progress bars:

```tsx
className="w-[14rem] mt-5 -ml-58 -mr-55"
className="w-[14rem] mt-5 -ml-58 -mr-50"
className="w-[14rem] mt-5 -ml-50 -mr-50"
```

When porting, preserve visually if exact match is required, but a grid-based stepper is safer.

### 13.3 Summary Band

```tsx
<div className="text-[#f36723] flex justify-between bg-[#fde8de] min-h-[40px] min-w-full rounded-2xl p-3">
```

Fields:

- Total App
- Purchase Amount
- OS Balance

### 13.4 Process Action Buttons

Container:

```tsx
<div className="flex justify-end mr-5">
  <div className="flex flex-wrap items-center justify-end gap-4">
```

Button style:

```tsx
className="flex justify-between min-w-[11rem] items-center text-[#f36723] border-[#f36723] bg-[#fde8de] hover:bg-[#ffe2d3]"
```

Sampling Filter button width:

```tsx
className="flex justify-between min-w-[12rem] items-center text-[#f36723] border-[#f36723] bg-[#fde8de] hover:bg-[#ffe2d3]"
```

Button sequence:

1. Scrutinize
2. Doc Mapping
3. BRE
4. Data Sampling
5. Sampling Filter

State rules:

- Scrutinize requires upload import complete.
- Doc Mapping requires scrutinize complete.
- BRE requires doc mapping complete.
- Data Sampling requires BRE complete and no BRE failure.
- Sampling Filter is disabled until Data Sampling has been clicked and sampling data is ready.

Data Sampling button label:

```tsx
<p>Data Sampling</p>
```

Sampling Filter label with active count:

```tsx
<p>Sampling Filter{activeSamplingFilterCount ? ` (${activeSamplingFilterCount})` : ""}</p>
```

## 14. Sampling Filter Modal

Source: `src/components/Upload Pool File/SamplingFilterDialog.tsx`

This modal belongs only beside the Data Sampling button on the BRE/file-rundown page.

Do not put this filter in the general Applications tab.

### 14.1 Modal Shell

Dialog content:

```tsx
<DialogContent className="w-[min(860px,calc(100vw-2rem))] max-w-[860px] gap-0 overflow-hidden rounded-xl border border-[#d8deea] bg-white p-0 shadow-2xl sm:max-w-[860px]">
```

Header:

```tsx
<DialogHeader className="border-b border-[#e8edf5] px-6 py-5">
  <DialogTitle className="text-lg font-semibold text-slate-950">
    Sampling Filter for: All applications
  </DialogTitle>
  <DialogDescription className="text-sm text-slate-500">
    See results in your view based on the sampling filters you select here.
  </DialogDescription>
</DialogHeader>
```

Main two-column grid:

```tsx
<div className="grid h-[500px] grid-cols-[330px_minmax(0,1fr)]">
```

Left column:

```tsx
<aside className="border-r border-[#e8edf5] bg-white px-4 py-5">
```

Right column:

```tsx
<section className="bg-white px-6 py-5">
```

### 14.2 Left Filter Navigation

Header:

```tsx
<h3 className="text-sm font-semibold text-slate-950">Sampling Filter</h3>
```

Applied pill:

```tsx
className="rounded-full bg-[#fde8de] px-3 py-1 text-xs font-medium text-[#f36723]"
```

Nav button grid:

```tsx
className="grid h-11 w-full grid-cols-[24px_minmax(0,1fr)_auto_18px] items-center gap-2 rounded-md border px-3 text-left transition-colors"
```

Selected nav item:

```tsx
"border-[#f36723] bg-[#fff4ec]"
```

Unselected nav item:

```tsx
"border-[#d8deea] bg-white hover:bg-slate-50"
```

Icon cell:

```tsx
className="flex size-6 items-center justify-center rounded-md text-[#f36723]"
```

Summary pill:

```tsx
className="max-w-[96px] truncate rounded-full bg-[#fde8de] px-2 py-1 text-xs font-medium text-[#f36723]"
```

### 14.3 Filter Items

Left navigation items:

- Top borrowers A/cs
- LTV %
- Geographical spread
- Credit score
- Seasoning
- Residual tenor
- Constitution
- Salaried / Non-salaried

Filter model:

```ts
type SamplingFilters = {
  topBorrowerMode: "percentage" | "accounts";
  topBorrowerValue: string;
  ltvOperator: ComparisonOperator;
  ltvValue: string;
  geographyOperator: ComparisonOperator;
  geographyValue: string;
  constitution: "all" | "individual" | "non_individual";
  employment: "all" | "salaried" | "non_salaried";
  creditScoreOperator1: ComparisonOperator;
  creditScoreValue1: string;
  creditScoreOperator2: ComparisonOperator;
  creditScoreValue2: string;
  seasoningOperator1: ComparisonOperator;
  seasoningValue1: string;
  seasoningOperator2: ComparisonOperator;
  seasoningValue2: string;
  residualTenorOperator: ComparisonOperator;
  residualTenorValue: string;
};
```

Operator/value row:

```tsx
<div className="grid grid-cols-[minmax(0,1fr)_176px] gap-3">
```

Select trigger:

```tsx
className="h-10 rounded-md border-[#d8deea] bg-white text-sm"
```

Input:

```tsx
className="h-10 rounded-md border-[#d8deea] bg-white pr-14 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
```

Custom range chip:

```tsx
className="rounded-md border border-[#f36723] bg-white px-3 py-2 text-sm font-medium text-[#f36723]"
```

### 14.4 Modal Footer

Footer:

```tsx
<DialogFooter className="border-t border-[#e8edf5] px-6 py-4 sm:items-center sm:justify-between">
```

Result count:

```tsx
<div className="mr-auto text-sm text-slate-500">
  Results: <span className="font-semibold text-slate-950">...</span>
</div>
```

Clear all:

```tsx
className="h-10 min-w-[92px] border-[#d8deea] text-slate-700 hover:bg-slate-50"
```

Export CSV:

```tsx
className="h-10 min-w-[104px] gap-2 border-[#d8deea] text-slate-700 hover:bg-slate-50"
```

Cancel:

```tsx
className="h-10 min-w-[92px] border-[#d8deea] text-slate-700 hover:bg-slate-50"
```

Apply:

```tsx
className="h-10 min-w-[116px] bg-[#f36723] text-white hover:bg-[#d95a1f]"
```

## 15. Individual Application Detail

Source: `src/components/Application/LoanApplicationView.tsx`

Tabs:

- Personal Information
- Documents
- Upload Documents
- Audit / Logs for bank users
- CBS APIs in some flows

Important behavior:

- On `Upload Documents`, hide the lead id/CIBIL score sidebar block.
- Other tabs show the sidebar block.

Document tab state:

```ts
type Tab =
  | "Personal Information"
  | "Audit / Logs"
  | "Documents"
  | "Upload Documents"
  | "CBS APIs";
```

Section header style:

```tsx
<div className="flex items-center gap-2 text-[#0089CF] border-b-2 border-[#0089CF]/10 pb-2">
  <h3 className="text-[13px] font-bold uppercase tracking-wider">...</h3>
</div>
```

Field label/value:

```tsx
<span className="text-[13px] text-gray-500 whitespace-nowrap">{label}</span>
<span className="text-[13px] font-bold text-gray-900">{value || "-"}</span>
```

## 16. Upload Documents Screen

Source: `src/components/Application/LoanApplicationView.tsx`

The upload documents screen is a custom three-column workspace inspired by `temp/imgs/docs-page-ref.png`.

It intentionally does not create a separate "Document" tab or a number column inside document tables.

### 16.1 Data Model

Document groups:

- KYC DOCUMENTS
- LOAN DOCUMENTS
- MORTGAGE DOCUMENTS

Category colors:

```ts
KYC:
dotClass: "bg-[#22c55e]"
headingClass: "text-[#16a34a]"
headerClass: "bg-[#f0fbf4]"
uploadClass: "text-[#16a34a]"

Loan:
dotClass: "bg-[#1683f7]"
headingClass: "text-[#1677ff]"
headerClass: "bg-[#f1f7ff]"
uploadClass: "text-[#1677ff]"

Mortgage:
dotClass: "bg-[#7c3aed]"
headingClass: "text-[#6d28d9]"
headerClass: "bg-[#f8f5ff]"
uploadClass: "text-[#6d28d9]"
```

Document status pills:

```tsx
Approved: "bg-[#dcfce7] text-[#16a34a]"
Under Review: "bg-[#fef3c7] text-[#d97706]"
Uploaded: "bg-[#dbeafe] text-[#1677ff]"
```

Workflow steps:

```tsx
Upload: "bg-[#ff6b1a] text-white"
Review: "bg-[#e5eaf2] text-[#64748b]"
Approved: "bg-[#e5eaf2] text-[#64748b]"
Rejected: "bg-[#e5eaf2] text-[#64748b]"
```

Legend:

```tsx
Uploaded: "bg-[#1683f7]"
Under Review: "bg-[#f59e0b]"
Approved: "bg-[#22c55e]"
Rejected: "bg-[#ef4444]"
```

### 16.2 Upload Form Panel

Right upload card:

```tsx
<aside className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
```

Title:

```tsx
<h3 className="mb-4 text-xs font-bold uppercase tracking-[0.02em] text-[#1f2a44]">
  Upload Document
</h3>
```

Label:

```tsx
className="text-[11px] font-semibold text-[#64748b]"
```

Select:

```tsx
className="h-9 w-full rounded-md border border-[#dbe3ef] bg-white px-3 text-xs font-medium text-[#334155] outline-none"
```

Input:

```tsx
className="h-9 rounded-md border-[#dbe3ef] text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
```

Upload drop area:

```tsx
className="flex h-[150px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#cbd5e1] bg-white px-4 text-center hover:bg-[#f8fafc]"
```

Browse pill:

```tsx
className="rounded-md border border-[#dbe3ef] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-sm"
```

Remarks:

```tsx
className="min-h-[90px] resize-none rounded-md border-[#dbe3ef] text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
```

Cancel:

```tsx
className="h-9 border-[#dbe3ef] px-4 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
```

Upload and Submit:

```tsx
className="h-9 bg-[#ff5f1f] px-4 text-xs font-semibold text-white hover:bg-[#e9541b]"
```

Info note:

```tsx
className="flex gap-2 rounded-md border border-[#93c5fd] bg-[#eff6ff] p-3 text-[11px] leading-4 text-[#2563eb]"
```

### 16.3 Temporary Frontend Functionality

The current implementation makes these functional from the frontend:

- Upload: stores selected file in local state and appends a document row.
- View: opens an object URL for uploaded files or a text preview for mock records.
- Download: downloads uploaded file or generated placeholder text.

When porting, keep the UI contract even if APIs are not ready:

- Do not block rendering on backend document APIs.
- Keep local optimistic rows.
- Replace local handlers with backend calls later.

## 17. Overview Dashboard

Source: `src/components/Overview/Overview.tsx`

Page wrapper:

```tsx
<div className="min-h-screen bg-#fde8de-100">
  <div className="max-w-auto mx-auto px-2 py-2">
    <div className="space-y-6">
```

Precision note:

- `bg-#fde8de-100` is invalid Tailwind.
- Use `bg-[#fde8de]` in the target project.

Overview grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
```

Footer/system info panel:

```tsx
className="mt-3 pt-6 border-t border-slate-300 bg-white/50 backdrop-blur-sm rounded-xl p-6 shadow-sm"
```

Data source pills:

```tsx
className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium"
```

## 18. API Documentation Page Pattern

Source: `src/components/API-Documentation/ApiDocumentationScreen.tsx`

This page has the most complete orange information-card language.

Page background:

```tsx
className="min-h-screen bg-[#fde8de] p-2 sm:p-3 lg:p-4"
```

Main card:

```tsx
className="overflow-hidden rounded-md border border-[#f3b38f]/70 bg-white shadow-sm"
```

Icon tile:

```tsx
className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#f3b38f] bg-[#fff4ec] text-[#f36723]"
```

Title:

```tsx
className="text-lg font-semibold text-[#1D2D3E] sm:text-xl"
```

Description:

```tsx
className="max-w-4xl text-sm leading-6 text-[#62748E]"
```

Orange panel:

```tsx
className="rounded-lg border border-[#f3b38f]/70 bg-[#fffaf6] p-3"
```

Tabs:

```tsx
className="min-h-11 whitespace-normal rounded-md px-3 py-2.5 text-center font-semibold leading-5 text-[#62748E] transition-all hover:bg-[#fff4ec] hover:text-[#c24f12] data-[state=active]:bg-[#f36723] data-[state=active]:text-white data-[state=active]:shadow-sm"
```

Use this page as the best reference for refined orange cards.

## 19. Icon System

There are two icon sources:

1. `lucide-react` for inline UI actions.
2. SVG/PNG files in `public/images/icons` and `public/images/icons/sidebar`.

Use lucide for:

- Download
- UploadCloud
- Funnel
- ArrowUpDown
- Eye
- ChevronRight
- Calendar
- User
- Logout/profile actions

Use asset masks for sidebar:

```tsx
style={{
  WebkitMaskImage: `url(${icon})`,
  maskImage: `url(${icon})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
}}
```

CSS filters:

```css
.filter-orange {
  filter: brightness(0) saturate(100%)
    invert(53%) sepia(85%) saturate(1466%) hue-rotate(348deg)
    brightness(99%) contrast(97%);
}

.filter-blue {
  filter: brightness(0) saturate(100%)
    invert(21%) sepia(94%) saturate(2786%) hue-rotate(202deg)
    brightness(95%) contrast(89%);
}

.filter-gray {
  filter: invert(20%) sepia(10%) saturate(100%) hue-rotate(0deg) brightness(60%) contrast(0%);
}
```

Prefer mask-based coloring for new monochrome SVGs. Use filter classes only when an existing image asset cannot inherit `currentColor`.

## 20. Navigation and Routing Patterns

Routes that drive major visual contexts:

Applications:

```tsx
<Route path="/applications/*" element={<PrivateRoutes><ApplicationRoutes /></PrivateRoutes>} />
```

Applications internal:

```tsx
<Route path="" element={<Layout><Applications /></Layout>} />
<Route path="/:id" element={<Layout><LoanApplicationView /></Layout>} />
```

Buyout:

```tsx
<Route path="/upload-pool-file/*" element={<PrivateRoutes><UploadPoolFileRoutes /></PrivateRoutes>} />
```

Buyout internal:

```tsx
<Route path="" element={<Layout><DisbursementFileUpload /></Layout>} />
<Route path="file-rundown/:trancheId" element={<Layout><DisbursementFileRundown /></Layout>} />
<Route path="file-infer" element={<Layout><DisbursementFileInfer /></Layout>} />
```

Batch list:

```tsx
<Route path="/batch-list" element={<Layout><BatchListPage /></Layout>} />
<Route path="/batch-list/:batchId" element={<Layout><PoolBatchView /></Layout>} />
```

## 21. Copy Procedure Into Another Project

Follow this order to avoid broken imports and visual mismatches.

1. Install dependencies.

```bash
npm install tailwindcss @tailwindcss/vite tw-animate-css clsx tailwind-merge class-variance-authority lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-progress @tanstack/react-table react-day-picker date-fns sonner
```

2. Copy the Vite Tailwind setup.

- Add `tailwindcss()` to Vite plugins.
- Add alias `@` to `src`.

3. Copy global CSS from `src/App.css`.

- Include Tailwind imports.
- Include token bridge.
- Include `:root` and `.dark`.
- Include `.filter-orange`, `.filter-blue`, `.filter-gray`.
- Decide whether to keep global scrollbar hiding.
- Fix font import if using Poppins.

4. Copy utility helpers.

- `src/lib/utils.ts`
- Especially `cn` and `assetPath`.

5. Copy assets.

- `public/images/pool-logo.png`
- `public/images/bstl_logo.png`
- `public/images/icons/sidebar/*.svg`
- Any feature icons referenced by copied screens.

6. Copy UI primitives.

- Start with `button`, `card`, `input`, `textarea`, `select`, `dialog`, `table`, `pagination`, `dropdown-menu`, `popover`, `calendar`, `tabs`, `progress`, `badge`.
- Keep file names and import paths identical where possible.

7. Copy shell components.

- `Layout.tsx`
- `Sidebar.tsx`
- `Header.tsx`
- `ProfileModal.tsx`
- `src/lib/constants/sidebar.ts`

8. Copy feature components as needed.

- Applications: `Application.tsx`, `PendingApplications.tsx`, `LoanApplicationView.tsx`.
- Buyout: `DisbursementFileUpload.tsx`, `DisbursementFileRundown.tsx`, `SamplingFilterDialog.tsx`.
- Tables: `data-table.tsx`, `PoolBatchListTable.tsx`.

9. Replace API hooks with target project hooks.

Keep the visual wrappers and states. Only swap data sources.

10. Run a visual QA pass.

Check:

- Sidebar active states.
- Header shadow.
- Table column spacing.
- Date picker selected range.
- Buyout stage persistence.
- Data Sampling disabled until BRE complete.
- Sampling Filter modal appears beside BRE page controls only.
- Upload Documents hides lead/CIBIL sidebar only on that tab.
- Upload/view/download document temporary behavior.

## 22. Design Rules for New Screens

Use these rules for any new screen that should feel native to this app.

- Page background: `bg-[#fde8de]`.
- Main page padding: `p-3`.
- Main surface: `bg-white rounded-lg shadow-sm`.
- Primary action: orange filled only when committing a process.
- Secondary action: orange outline/soft fill.
- Neutral action: slate text with `border-[#d8deea] hover:bg-slate-50`.
- Information color: blue only for date picker, links, info notes, and section accents.
- Table title: `text-lg font-bold`, either `#62748E` or `#0A4DA2`.
- Table border wrapper: `border border-[#D1E9FF]`.
- Form labels: `text-[11px] font-semibold text-[#64748b]`.
- Form inputs: `h-9` or `h-10`, `rounded-md`, `border-[#dbe3ef]` or `border-[#d8deea]`.
- Modal max width: `860px` for complex filters, `sm:max-w-lg` for simple dialogs.
- Modal footer buttons: neutral left/middle, orange apply/commit.
- Use lucide icons inside action buttons.
- Do not add decorative gradient blobs or marketing-style hero layouts.
- Keep operational screens dense and scannable.

## 23. Current Visual Quirks to Preserve or Fix

Preserve if exact copy is required:

- Global hidden scrollbars.
- Sidebar width `min-w-64`.
- Header orange offset shadow `shadow-[2px_2px_#f36723]`.
- Button default is orange outline, not filled.
- Table primitive defaults are `16px`, with local overrides to `text-sm`.
- Sampling modal width is exactly capped at `860px`.
- Document upload panel uses `11px` labels and `150px` upload drop zone.

Fix when improving the target project:

- `bg-#fde8de-100` is invalid in `Layout.tsx` and `Overview.tsx`; use `bg-[#fde8de]`.
- Poppins is referenced but not imported; import it explicitly.
- The `blue` button variant is orange; rename or remove it.
- Some legacy pages still use blue primary buttons (`#00ADEF`, `#0B5FFF`, `blue-500`).
- Global scrollbar hiding can reduce discoverability for wide tables.
- Some table headers and cells rely on center alignment inconsistently; standardize per table.

## 24. Minimal Token File for a New Project

If the target project has its own theme system, map these first:

```ts
export const poolDesignTokens = {
  color: {
    appBg: "#fde8de",
    surface: "#ffffff",
    primary: "#f36723",
    primaryHover: "#d95a1f",
    primarySoft: "#fde8de",
    primarySoftHover: "#ffe2d3",
    primaryPanel: "#fff4ec",
    primaryPanelWarm: "#fffaf6",
    primaryBorder: "#f3b38f",
    blue: "#0089CF",
    blueDeep: "#0A4DA2",
    blueDate: "#0389CC",
    blueSoft: "#F0F9FF",
    borderBlue: "#D1E9FF",
    borderNeutral: "#d8deea",
    borderInput: "#dbe3ef",
    textStrong: "#0f172a",
    textNavy: "#1D2D3E",
    textBody: "#334155",
    textMuted: "#64748b",
    success: "#16a34a",
    successDot: "#22c55e",
    successSoft: "#dcfce7",
    warning: "#d97706",
    warningDot: "#f59e0b",
    warningSoft: "#fef3c7",
    danger: "#ef4444"
  },
  radius: {
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.875rem"
  },
  shadow: {
    card: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sidebar: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    modal: "0 25px 50px -12px rgb(0 0 0 / 0.25)"
  }
};
```

## 25. Component Recipes

### Orange Secondary Button

```tsx
<Button
  variant="outline"
  className="gap-2 border-[#f36723] bg-[#fde8de] text-[#f36723] hover:bg-[#ffe2d3]"
>
  <Download className="h-4 w-4 filter-orange" />
  Download CSV
</Button>
```

### Orange Primary Button

```tsx
<Button className="h-10 min-w-[116px] bg-[#f36723] text-white hover:bg-[#d95a1f]">
  Apply
</Button>
```

### Neutral Modal Button

```tsx
<Button
  variant="outline"
  className="h-10 min-w-[92px] border-[#d8deea] text-slate-700 hover:bg-slate-50"
>
  Clear all
</Button>
```

### Table Card

```tsx
<div className="bg-white shadow-sm rounded-lg mb-4">
  <div className="flex items-center justify-between p-3 border-b border-[#fde8de]">
    <h2 className="text-lg font-bold text-[#0A4DA2]">Title</h2>
    <div className="flex items-center gap-2">...</div>
  </div>
  <div className="border border-[#D1E9FF]">
    <Table>...</Table>
  </div>
</div>
```

### Compact Field

```tsx
<div className="space-y-1.5">
  <label className="text-[11px] font-semibold text-[#64748b]">Label</label>
  <Input className="h-9 rounded-md border-[#dbe3ef] text-xs focus-visible:ring-0 focus-visible:ring-offset-0" />
</div>
```

### Two-Column Filter Modal Layout

```tsx
<DialogContent className="w-[min(860px,calc(100vw-2rem))] max-w-[860px] gap-0 overflow-hidden rounded-xl border border-[#d8deea] bg-white p-0 shadow-2xl sm:max-w-[860px]">
  <DialogHeader className="border-b border-[#e8edf5] px-6 py-5">...</DialogHeader>
  <div className="grid h-[500px] grid-cols-[330px_minmax(0,1fr)]">
    <aside className="border-r border-[#e8edf5] bg-white px-4 py-5">...</aside>
    <section className="bg-white px-6 py-5">...</section>
  </div>
  <DialogFooter className="border-t border-[#e8edf5] px-6 py-4 sm:items-center sm:justify-between">...</DialogFooter>
</DialogContent>
```

## 26. Visual QA Checklist

Use this after migration:

- App background is warm orange, not gray.
- Sidebar is white, full height, sticky, and exactly 16rem minimum width.
- Active sidebar item has soft orange fill and orange icon/text.
- Header is sticky with orange offset shadow.
- Buttons default to orange outline unless intentionally filled.
- Primary filled buttons use `#f36723`, not purple or blue.
- Cards are white with `shadow-sm`, not heavy borders.
- Tables have no unnecessary horizontal scroll after requested column reductions.
- Table toolbar spacing is `gap-2` and table cards use `rounded-lg`.
- Pagination active page is orange.
- Application date picker uses blue selected range.
- Sampling Filter exists only on file-rundown/BRE process page.
- Sampling Filter is disabled until Data Sampling is clicked.
- Sampling modal left column is 330px and right editor fills remaining width.
- Sampling modal footer has Clear all and Export CSV with the same neutral style.
- Upload Documents tab hides lead id/CIBIL/sidebar blocks only on that tab.
- Upload Documents has no Number column and no Document Type column in the document list.
- Document upload form is right aligned, compact, and uses orange submit.
- View/download/upload work from local frontend state until backend APIs are ready.
