# 🛠️ Example: Adding a New "Gold Loan" Journey

This example walks you through adding a brand new journey. You will learn how to mix **Common Fields** (reusable) with **Custom Fields** (unique to this journey).

---

## 🎯 Goal
Create a "Gold Loan" journey where:
- We reuse `full_name` and `mobile` from the global list.
- We **skip** the `email` field (not needed for this loan).
- We add a **new** field specific to gold: `gold_weight_grams`.

---

## 📝 Step-by-Step

### 1. Identify Common Fields
Open `app/_config/journeys.ts` and look at the `COMMON_FIELDS` object at the top. We will use `full_name` and `mobile`.

### 2. Define the New Journey
Add this block inside the `journeys` object for your bank:

```typescript
"cosmos": {
  // ... existing journeys ...

  "gold-loan": {
    title: "Instant Gold Loan",
    type: "gold",
    steps: [
      {
        id: "applicant_info",
        label: "Applicant Information",
        fields: [
          COMMON_FIELDS.full_name, // ✅ Reusing a common field
          COMMON_FIELDS.mobile,    // ✅ Reusing another common field
          // ❌ Note: We simply didn't include COMMON_FIELDS.email here
          
          { // ✨ Adding a BRAND NEW custom field
            name: "gold_purity",
            label: "Gold Purity (Karat)",
            type: "select",
            required: true,
            options: [
              { label: "22K", value: "22" },
              { label: "24K", value: "24" }
            ]
          },
          { // ✨ Adding another custom field
            name: "gold_weight",
            label: "Weight in Grams",
            type: "number",
            required: true,
            placeholder: "e.g. 10.5"
          }
        ]
      },
      {
        id: "final_step",
        label: "Terms & Conditions",
        fields: [
          COMMON_FIELDS.consent_basic // ✅ Reusing common consent
        ]
      }
    ]
  }
}
```

### 3. How to "Remove" a Field
If you are using a set of common fields but want to **remove** one (e.g., you don't want to ask for `Email` in a Gold Loan):

- **Don't search for a "delete" command.**
- Simply **omit** (don't type) that field in your `fields: []` array.
- The system only renders what you explicitly list. If it's not in the array, it won't exist on the screen.

### 4. Verify the Results
1. Save the file.
2. Visit `localhost:3000/cosmos/gold-loan`.
3. You will see a 2-step journey with exactly the fields you defined. Notice that `Email` is completely gone!

---

## 💡 Key Takeaways
- **Efficiency**: Reusing `COMMON_FIELDS` ensures consistency across the whole bank.
- **The "Omission" Rule**: To "remove" a field from a journey, just don't add it to the list. The UI is built additively.
- **Hybrid Approach**: You can mix and match common and custom fields in the same array as shown above.
