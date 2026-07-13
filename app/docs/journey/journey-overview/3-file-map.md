# 🗺️ Multi-Tenant Journey — Detailed File & Folder Map

This document is a **comprehensive technical inventory** of the Journey Engine and Multi-Tenant architecture. It explains the "Why" and "How" behind every file and folder we've created.

---

### 📂 1. Routing & Shells (`app/(public)/`)

- **`[orgSlug]/layout.tsx`**  
  **The Branding Shell.** This is the first layer of truth. It captures the unique bank name (e.g., `cosmos`, `hdfc`) from the URL and uses a hook to inject the bank's primary colors into the CSS `:root`. This ensures that every child page automatically uses the correct brand colors.

- **`[orgSlug]/[journeyType]/layout.tsx`**  
  **The Layout Manager.** It creates a persistent two-column UI. The left side is a fixed **VerticalProgressBar** (sidebar), and the right side is a scrollable main area. By using a layout at this level, we ensure the sidebar doesn't "flicker" when the user moves between steps.

- **`[orgSlug]/[journeyType]/page.tsx`**  
  **The State Initializer.** This is the main "Brain" for a new journey. It fetches the required steps from our configuration, merges any organization-specific "Extra Steps," and loads them into a global store. It prepares the application to start at Step 1.

- **`[orgSlug]/[journeyType]/steps/common-step.tsx`**  
  **The Standard Rendering Engine.** This file is a powerful, generic form builder. If a step in your config is just a list of text fields/dropdowns, this engine builds the UI, handles the validation, and manages the "Continue" button automatically.

- **`[orgSlug]/[journeyType]/steps/uncommon-step.tsx`**  
  **The Extension Engine.** Built specifically for organization-specific "extra" content. It renders the standard fields for a step but also adds a specialized section for "Extra Fields" unique to that bank, often badged as bank-specific data.

---

### 📂 2. Step Logic & Dispatching (`app/_components/journey/`)

- **`StepRenderer.tsx`**  
  **The Controller.** It is the "Traffic Cop" of the journey. It looks at the current step and makes a decision: "Is this a specialized component like `AuthStep`? If not, is it a common step or a bank-specific extra step?" It then mounts the correct component instantly.

- **`step-registry.ts`**  
  **The Switchboard.** A simple, mission-critical mapping file. It connects a string ID from your configuration (e.g., `"authentication"`) to an actual React file. This decoupling allows you to swap entire pieces of UI without touching the core routing logic.

- **`AuthStep.tsx`**  
  **The Specialized Security Flow.** This is the only "hardcoded" step UI because it requires complex logic that a JSON config can't handle. It generates random Captchas, manages OTP timers, and handles the "Phase 1 to Phase 2" (Phone to OTP) transition.

- **`VerticalProgressBar.tsx`**  
  **The Sidebar UI.** A reactive component that listens to the global store. It draws a list of all steps in the journey and automatically updates their status (Completed, Active, Pending) with checkmarks and highlight colors.

---

### 📂 3. The Field Factory & UI Primitives (`app/_components/fields/`)

- **`FieldFactory.tsx`**  
  **The Interpreter.** This is the bridge between JSON and React. It takes a piece of data (e.g., `{ type: "select", options: [...] }`) and knows to mount the `SelectField` component. It ensures all inputs have unified error handling and labels.

- **`TextField.tsx`**  
  **The Primary Input.** A high-performance text and number input component. It supports focus states, error highlights, and organization-specific styling boundaries.

- **`RadioGroup.tsx`**  
  **The Selection Provider.** A custom-styled radio input component. It transforms a list of options into a set of interactive buttons, handling value selection and validation feedback.

---

### 📂 4. System Logic & Configurations (`app/_config/`, `_store/`, `_hooks/`)

- **`_config/journeys.ts`**  
  **The Blueprints.** The definitive master-file where every journey is defined. It contains the "Common Fields" (Name, DOB) and describes the exact sequence of steps for every bank in the system. **This is where you go to change the journey flow.**

- **`_config/orgs.ts`**  
  **The Identity Registry.** A central list of all supported organizations. It holds their Logos, API Base URLs, and Branding Tokens (Colors). This file is what makes the application truly multi-tenant.

- **`_store/journeyStore.ts`**  
  **The Global Memory.** A Zustand-powered state manager. It remembers every piece of data the user types, tracks which steps are finished, and notifies the entire application when a user moves forward or backward.

- **`_hooks/useOrgTheme.ts`**  
  **The Theme Injector.** A custom React hook that takes a bank's branding tokens and converts them into CSS variables (e.g., `--primary: #f37021`). These are injected into the browser's `:root` so every component can use them for styling.

---

### 📂 5. Data Contracts & Visuals (`app/_types/`, `_styles/`)

- **`_types/journey.ts`**  
  **The Journey Rules.** A TypeScript safety file. It ensures that whenever you define a new step or field in the config, it follows the correct structure. This prevents "broken config" bugs during development.

- **`_types/org.ts`**  
  **The Org Rules.** Defines the shape of organization metadata. It ensures that every bank in the registry has a valid logo, name, and branding configuration.

- **`_styles/themes/cosmos.css`**  
  **The Visual Overrides.** A dedicated CSS file that contains the specific colors and layout tweaks for Cosmos Bank, layered on top of the generic application styles.

---

### 🏁 Developer's Cheat-Sheet
-   **Want to add a new form field?** → Edit `_config/journeys.ts`.
-   **Want to add a new bank?** → Update `_config/orgs.ts` and add a CSS theme.
-   **Want to change the Login UI?** → Look at `_components/journey/AuthStep.tsx`.
-   **Want to fix a Text Box style?** → Look at `_components/fields/TextField.tsx`.
