# 🔄 Multi-Tenant Journey — Detailed Working & Data Flow

This document breaks down the "User Lifecycle" from the moment they visit a URL to the moment they finish their loan journey.

---

### 📥 1. The Entrance (URL Resolution)
When a user visits `/cosmos/personal`:
1.  **Next.js Dynamic Routing** (`[orgSlug]/[journeyType]/page.tsx`) extracts "cosmos" and "personal" from the URL.
2.  **Lookup Logic**: The app finds the matching organization (**Cosmos Bank**) in `orgs.ts` and the journey (**Personal Loan**) in `journeys.ts`.
3.  **Branding Injection**: The **`[orgSlug]/layout.tsx`** takes those constants and updates CSS variables for colors, fonts, and the logo.
4.  **Runtime Merge**: Our **`page.tsx`** identifies the bank's core **`steps`** and overlays any bank-specific **`extraSteps`**. This combined list is then "Hydrated" into our **Zustand Store**!

---

### 🧠 2. The Store (Zustand: Single Source of Truth)
Our **`journeyStore.ts`** is a central shared memory.
- **`config`**: Holds the current bank's journey (labels, field types, step order).
- **`currentStepIndex`**: An integer (0, 1, 2...) representing where the user is.
- **`formData`**: A dynamic key-value map (`{ mobile: "9988...", full_name: "Aditya", ... }`) where every keystroke is saved.
- **`completedSteps`**: A list of indices that have passed validation.
This single object notifies the **Sidebar**, the **Form**, and the **Next Button** every time something changes.

---

### 🛠️ 3. The Form Renderer (The Loop)
The **`StepRenderer.tsx`** is a high-level dispatcher. It doesn't "know" how to draw a form; it just asks:
1.  *"Is there a specialized file for this step in the registry (like `AuthStep.tsx`)?"*
    -   **YES**: Mount that file and let it handle its own logic (e.g., Captcha/OTP).
2.  *"Is this an organization-specific extension (`isExtra: true`)?"*
    -   **YES**: Mount the **`UncommonStep`** renderer. It draws both standard and extra fields with a specialized badge.
3.  **FALLBACK**: Mount the **`CommonStep`** renderer. This is our default engine for 90% of forms.

---

### 📝 4. The Primitive Layer (Field Factory)
Every input you see (Text boxes, Dropdowns, Radios) is rendered by the **`FieldFactory.tsx`**.
- The Factory loops through the `fields: []` array from your config.
- It "Switches" on `field.type`. If it sees `"number"`, it mounts **`NumberField.tsx`**.
- This layer handles shared properties like `required`, `placeholder`, and `label`. **This is where you build accessibility (ARIA tags) and unified error styling.**

---

### ✅ 5. Validation & Navigation Lifecycle
When a user clicks **"Continue"**:
1.  **Validation**: The current step component (e.g., `CommonStep`) loops through its fields. It checks for `required: true` and any `validation` rules.
2.  **Local Error State**: If something is missing, the step updates its local `errors` state, showing red text.
3.  **Global Store Update**: If everything is valid:
    -   `markStepComplete(index)` is called. The **Sidebar** dot turns green.
    -   `nextStep()` is called. The `StepRenderer` unmounts the current form and slides in the next one automatically.
4.  **Persistence**: The state stays in memory (Zustand) until the browser session ends.

---

### 💡 The Golden Decision Rule for New Devs

| If you need... | Then... |
| :--- | :--- |
| **A new input (e.g., Slider)** | Update `FieldFactory.tsx` + add a common field in config. |
| **New fields for ONE bank** | Add them to `extraFields` or `extraSteps` in `journeys.ts`. |
| **Custom interactive logic** | Add a file to `_components/journey/` AND a key to `step-registry.ts`. |

**Summary**: This app is not a series of static pages. It is a **Real-Time Data Map** that converts JSON strings into a high-performance React experience!
