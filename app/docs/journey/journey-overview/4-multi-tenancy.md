# 🌐 Multi-Tenancy: The Developer's Handbook

Welcome! This guide explains how we handle multiple banks (tenants) using a single codebase. Our architecture is **"Config-First"**, which means you can change almost anything about a bank's portal without writing a single line of React or CSS.

---

## 🏗️ The Core Idea: "The Engine & The Fuel"
Think of the app as a **Car Engine** and the configuration as the **Fuel**. 
- The **Engine** (the code) stays the same for everyone.
- The **Fuel** (the config) determines the color, the speed, and where the car goes.

All your "fuel" lives in the `app/_config/` folder.

---

## 📂 The Two Main Files

### 1️⃣ `orgs.ts` (The Look & Feel)
This file is for high-level setup. It tells the app:
- **What colors to use?** (Primary, Secondary)
- **Where is the backend?** (API URLs, Tenant IDs)
- **What’s the name?** (Bank Name)
- **What’s on the homepage?** (Text, Stats, Products)

### 2️⃣ `journeys.ts` (The Step-by-Step Flow)
This is where you define the actual loan process. Each bank can have its own unique set of screens.

```typescript
"bank-slug": {
  "loan-type": {
    steps: [
      { label: "Welcome", component: "auth" }, // Uses a custom screen
      { 
        label: "About You", 
        fields: [ // Auto-generates a form for you!
          { name: "age", label: "Your Age", type: "number" }
        ] 
      }
    ]
  }
}
```

---

## 🛠️ "I want to..." (Quick Recipes)

### ✨ Add a brand new bank?
1. Open `app/_config/orgs.ts`.
2. Copy an existing bank block and paste it at the bottom.
3. Change the name and colors. 
4. **Result:** You now have a new portal at `localhost:3000/your-new-bank`!

### 🛣️ Change the order of screens?
1. Open `app/_config/journeys.ts`.
2. Move the objects inside the `steps: []` array up or down.
3. **Result:** The "Next" button will automatically lead to the new order.

### 📝 Add a new question to a form?
1. Find the step in `journeys.ts`.
2. Add a new object to the `fields` list:
   ```typescript
   { name: "fav_color", label: "Favorite Color", type: "text" }
   ```
3. **Result:** A new input field appears on the screen instantly.

### ✂️ Remove a screen entirely?
1. Delete that step from the `steps` array in `journeys.ts`.
2. **Result:** The journey gets shorter, and the progress bar updates itself.

---

## 💡 Pro Tips for Success

- **Don't Hardcode!**: Never type "Cosmos Bank" in a component. Use `{config.name}` instead.
- **Generic is Better**: Try to use the `fields` list instead of making a custom React component. It's much faster to maintain.
- **Check Twice**: If you change a field's `name`, make sure the backend dev knows, so they can save the data correctly!

---

## 🚦 How the Magic Happens (The Flow)
1. User visits `/bank-name/loan-type`.
2. The app looks up the settings for **bank-name** in `orgs.ts`.
3. The app looks up the steps for **loan-type** in `journeys.ts`.
4. The **StepRenderer** draws the current screen based on those settings.

**That's it! You're now a multi-tenancy expert.** 🚀
