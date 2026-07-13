# 🚀 Multi-Tenant Journey — System Architecture

Welcome! This system is a **"Configuration-Driven"** engine that powers diverse loan journeys for multiple organizations (tenants) using a single, unified codebase.

Instead of writing a new React page for every loan form, we use **JSON definitions** to describe the UI. This architecture ensures that adding a new bank or a new loan product takes minutes, not weeks.

---

### 📂 Folder & File Structure (A Dev's Map)

```
app/
│
├── (public)/                           ← The Customer-Facing UI
│   └── [orgSlug]/                      ← Tenant ID in URL (e.g., cosmos, hdfc)
│       └── [journeyType]/              ← Journey ID in URL (e.g., house, personal)
│           ├── page.tsx                ← MAIN HUB: Fetches the bank's unique config
│           └── steps/                  ← The generic form "engines"
│               ├── common-step.tsx     ← Renders standard global fields
│               └── uncommon-step.tsx   ← Renders tenant-exclusive fields
│
├── _components/                        ← The Reusable Toolkit (Underscore = Private)
│   ├── journey/
│   │   ├── AuthStep.tsx                ← THE exception: Complex logic for OTP/Captcha
│   │   ├── step-registry.ts            ← Switchboard: maps a string ID to a file
│   │   ├── StepRenderer.tsx            ← Dispatcher: decides which Step UI to mount
│   │   └── VerticalProgressBar.tsx     ← Sidebar: tracks real-time progress
│   │
│   ├── fields/                         ← The Raw Inputs (Building Blocks)
│   │   └── FieldFactory.tsx            ← Factory: converts a JSON field into a Component
│   │
│   └── ui/                             ← Design System (Buttons, Cards, Badges)
│
├── _config/                            ← The "Blueprints" (NO CODE HERE)
│   ├── orgs.ts                         ← Branding metadata (logos, colors)
│   └── journeys.ts                     ← Journey definitions (fields & step flow)
│
├── _store/                             ← The Memory (Zustand)
│   └── journeyStore.ts                 ← The brain that holds all form data & progress
│
└── _types/
    └── journey.ts                      ← The rules: ensures all JSON shapes are valid
```

---

### 🏛️ The Four Pillars of the Architecture

#### 1. Tenant Isolation (One Engine, Many Brands)
We use Next.js dynamic routes (`[orgSlug]`). When a user visits `/hdfc/house`, the app doesn't go "What is HDFC?". Instead, it looks up the word **"hdfc"** in our metadata registry (**`orgs.ts`**) and automatically applies that bank's logo, primary colors, and API endpoints to the entire screen.

#### 2. Config-Driven UI (JSON > Code)
Almost every form you see is generated from a list in **`journeys.ts`**. 
- To add a "Phone Number" field, you don't write `<input />`. 
- You simply add `{ name: "mobile", type: "number" }` to the list. 
The system reads this and builds the UI automatically. **Always try to solve a problem with config before writing new code.**

#### 3. The Component Registry (Decoupling)
Sometimes, a simple form isn't enough (e.g., the **AuthStep** which needs to generate Captchas). 
We use a **Registry Pattern**. Inside our config, we say `component: "authentication"`. The **`StepRenderer`** looks at this key, checks the **`step-registry.ts`**, and pulls in the specialized file. This keeps our core engine thin and our specialized logic isolated.

#### 4. The Unified Store (State Management)
We use **Zustand** as a "Global Shared Notebook."
- When you type your name on Step 1, the store writes it down.
- On Step 5, the "Review" page reads that notebook.
- The **Sidebar** also watches this notebook to know when to turn a dot green.
This prevents the "State Propagation" mess usually found in large forms.

---

### 🛠️ Common Tasks (Quick Start)

| Goal | Path |
| :--- | :--- |
| **Add a new field** | Add to `COMMON_FIELDS` in `_config/journeys.ts` |
| **Add a new input type** | Create file in `_components/fields/` → update `FieldFactory.tsx` |
| **Change bank colors** | Edit bank's `branding` object in `_config/orgs.ts` |
| **Add a new bank** | Create a new key in `_config/orgs.ts` (Routing is automatic!) |
| **Add a new total journey** | Define new `steps` array in `_config/journeys.ts` |
