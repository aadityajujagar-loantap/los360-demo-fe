# Step 5: Offer

## Ownership

| Item | Value |
| --- | --- |
| Step index | `5` |
| Step id | `ekyc` |
| Label | `Offer` |
| Component key | `ekyc` |
| Component | `app/_components/journey/_steps/EkycStep.tsx` |
| Primary API | `useProcessJourneyStepMutation` |

This step displays the eligibility decision and loan offer generated after Loan Details. The component name is historical; it currently behaves as the offer review and acceptance step.

## Input data

The step reads:

- `formData.eligible_offer`
- `formData.loan_amount`
- `formData.loan_amount_requested`
- `formData.repayment_period`
- `formData.loan_period_requested`
- `formData.branch`
- `config.type`

`eligible_offer` normally comes from `LoanDetailsStep` response, or from backend restore through `journeySlice.restoreFromApiData`.

## Offer normalization

The component normalizes offer data so display and payload use consistent fields.

| Normalized field | Source priority |
| --- | --- |
| `sanction_amount` | `offer.sanction_amount`, `offer.eligible_loan_amount`, requested loan amount |
| `eligible_loan_amount` | `offer.eligible_loan_amount`, `offer.sanction_amount`, requested loan amount |
| `roi` / `eligible_roi` | first positive numeric string from `offer.roi`, `offer.eligible_roi`; ignores blank and `floating` |
| `tenure` / `eligible_tenure` | `offer.tenure`, `offer.eligible_tenure`, requested tenure |
| `emi` / `eligible_emi` | `offer.emi`, `offer.eligible_emi`, or calculated EMI |
| `eligible` | explicit eligible flag, positive amount, or `has_reached_eligibility_offer` |

EMI calculation uses:

```ts
principal = sanction_amount
annualRate = roi
months = tenure
```

If rate, amount, or tenure is missing/non-positive, calculated EMI is `0`.

## Eligibility decision

Explicit ineligible values:

- `offer.eligible === false`
- `offer.eligible === "false"`
- `offer.eligible === "0"`

Explicit eligible values:

- `offer.eligible === true`
- `offer.eligible === "true"`
- `offer.eligible === "1"`

The user is treated as eligible if:

- not explicitly ineligible, and
- explicitly eligible, or sanction amount is positive, or eligible amount is positive, or `has_reached_eligibility_offer === true`.

## Eligible UI

The eligible screen displays:

- congratulations banner
- sanctioned amount
- approximate EMI
- ROI, or dash if no numeric ROI is available
- tenure
- disbursement branch
- disclaimer that the offer is tentative and subject to document verification and credit assessment

Primary action:

- `Accept Offer & Continue`

## Ineligible and manual review UI

If `offer.eligible === false`, the step renders a hard "Not Eligible" screen with:

- reason list from `offer.rejection_reasons`
- "Modify Details" button that calls `prevStep`
- "Restart Journey" button that clears storage keys and resets Redux

If the normalized offer is not eligible but not explicitly false, it renders a decision-pending/manual-review state and allows:

- back to loan details
- `Send for Manual Review`

## Accept/manual-review process-step call

Triggered by `handleApply`.

If the step is already completed, it skips the API and moves forward.

```ts
{
  step_key: stepConfig?.stepKey || "LOAN_OFFER",
  loan_type,
  payload: {
    application_id,
    section_id: "loan_offer_details",
    eligible,
    sanction_amount,
    eligible_loan_amount,
    roi,
    eligible_roi,
    eligible_emi,
    eligible_tenure,
    ev_param_eligible_cases: {
      age: "pass",
      loan_amount: "pass",
      tenure: "pass",
      credit_score: "base_roi_applied",
      foir: "pass",
      ltv: config.type === "personal" ? "not_applicable" : "pass"
    },
    rejection_reasons
  }
}
```

For ineligible/manual-review payloads, `rejection_reasons` defaults to:

```ts
[offer?.reason || "Check documentation"]
```

On success:

- normalized offer is written back into `formData.eligible_offer`
- `has_reached_eligibility_offer` is set true
- step 5 is marked complete
- `nextStep()` moves to Documents

On API failure:

- the component logs the error
- it still writes normalized offer data
- it marks the step complete
- it moves to Documents

This fallback is intentionally lenient in the current code.

## Restore behavior

`journeySlice.restoreFromApiData` restores offer data from either:

- nested `eligible_offer`
- flat application fields such as `eligible`, `sanction_amount`, `eligible_loan_amount`, `eligible_roi`, `eligible_emi`, `eligible_tenure`

When an offer exists or the offer-reached flag exists, restore forces the user to:

- step 5 in same-session reloads
- auth first, then step 5 after re-auth in new browser sessions

## Storage cleanup on restart

The hard ineligible restart path removes:

- `cosmos_loan_app_${loanType}`
- `cosmos_loan_app_${loanType}_state`
- `cosmos_loan_app_${loanType}_offer_reached`
- `cosmos_loan_app_${loanType}_auth`

Then it dispatches `resetJourney`.

Note: `_state` is removed here for legacy compatibility, but current `loanType.ts` does not create that key.

## Common gotchas

- ROI can be missing or non-numeric. The current code intentionally ignores `"floating"` and displays dash when no numeric ROI exists.
- Accept offer writes `section_id: "loan_offer_details"` before moving to document upload.
- The step can continue even if the process-step API fails.
- The component does not download the offer letter; that happens after final submission in `EligibilityStep`.
