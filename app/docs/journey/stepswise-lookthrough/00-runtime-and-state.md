# Runtime And State

This document covers the public journey runtime around the individual step components.

## Main files

| Concern | File |
| --- | --- |
| Public dynamic route | `app/(public)/[orgSlug]/[journeyType]/page.tsx` |
| Journey page shell | `app/(public)/[orgSlug]/[journeyType]/layout.tsx` |
| Journey definitions | `app/_config/journeys.ts` |
| Organization metadata and tenant auth | `app/_config/orgs.ts` |
| Redux state | `app/_lib/redux/slices/journeySlice.ts` |
| API hooks | `app/_lib/redux/services/adminApiSlice.ts` |
| Step dispatcher | `app/_components/journey/StepRenderer.tsx` |
| Step registry | `app/_components/journey/step-registry.ts` |
| Progress UI | `app/_components/journey/ThinDotsProgressBar.tsx` |
| Generic config-rendered steps | `app/(public)/[orgSlug]/[journeyType]/steps/common-step.tsx` |
| Extra config-rendered steps | `app/(public)/[orgSlug]/[journeyType]/steps/uncommon-step.tsx` |
| Local journey draft helpers | `app/_lib/journeyDraft.ts` |
| Document draft helpers | `app/_lib/documentDraftStorage.ts` |
| Backend document mapping | `app/_lib/documentMapping.ts` |
| Loan type and storage keys | `app/_lib/loanType.ts` |

## Route initialization

`app/(public)/[orgSlug]/[journeyType]/page.tsx` resolves the URL in this order:

1. It reads `orgSlug` and `journeyType` from route params.
2. It looks up `orgs[orgSlug]`.
3. It looks up `journeys[orgSlug][journeyType]`.
4. If the URL matches a static site page, it renders static content.
5. If the URL matches a journey, it dispatches `setConfig` and renders `StepRenderer`.
6. If neither exists, it returns `notFound()`.

`app/(public)/[orgSlug]/[journeyType]/layout.tsx` also dispatches `setConfig` with runtime org metadata. This is intentional in the current code. `setConfig` avoids resetting active form state when the same org, journey, and step count are already loaded.

## Journey config

`app/_config/journeys.ts` defines:

- `COMMON_FIELDS`: reusable `FieldConfig` entries.
- `COSMOS_PERSONAL_STEPS`: the current canonical ordered flow.
- `UNIFIED_STEPS`: currently an alias to `COSMOS_PERSONAL_STEPS`.
- `journeys`: registry by org slug and journey type.

All active Cosmos journeys use the same steps. The important difference is `JourneyDefinition.type`, which is one of:

- `personal`
- `vehicle`
- `property-mortgage`
- `education`
- `home`

Several components branch on `config.type`, especially `LoanDetailsStep`, `IncomeStep`, and `EligibilityStep`.

## Step dispatching

`StepRenderer` reads `config.steps[currentStepIndex]`.

Render order:

1. If `step.component` exists in `StepComponentRegistry`, render that registered component.
2. Else if `step.isExtra` is true, render `UncommonStep`.
3. Else render `CommonStep`.

`StepComponentRegistry` currently maps:

| Component key | Component |
| --- | --- |
| `authentication` | `AuthStep` |
| `aadhar_verification` | `AadharStep` |
| `individual_details` | `IndividualDetailsStep` |
| `income_details` | `IncomeStep` |
| `loan_details` | `LoanDetailsStep` |
| `ekyc` | `EkycStep` |
| `eligibility` | `EligibilityStep` |

## Redux state model

The `journey` slice stores:

| Field | Purpose |
| --- | --- |
| `config` | Active runtime `JourneyConfig` including org, tenant, journey type, and steps. |
| `currentStepIndex` | Zero-based index into `config.steps`. |
| `formData` | Shared mutable application data collected across all steps. |
| `completedStepIndices` | Step indexes marked complete for progress and skip behavior. |
| `isOtpSent` | Auth-step OTP phase flag. |
| `currentSubStepKey` | Backend/UI substep marker used during restore. |
| `targetStepIndex` | Deferred resume target after re-auth in a new browser session. |

Initial `formData` has:

```ts
{
  is_new_user: "yes",
  same_address: "yes"
}
```

After `setConfig`, `formData` is reset to:

```ts
{
  is_new_user: "yes",
  same_address: "yes",
  loan_type: getLoanTypeFromJourney(...)
}
```

## Navigation actions

| Action | Behavior |
| --- | --- |
| `setConfig` | Loads runtime config and resets state unless same org, same journey, and same step count are already active. |
| `updateFormData` | Shallow merges fields into `formData`. |
| `markStepComplete(index)` | Adds an index to `completedStepIndices` if missing. |
| `nextStep` | Moves to `targetStepIndex` if set; otherwise increments `currentStepIndex`. |
| `prevStep` | Decrements `currentStepIndex` if above zero. |
| `restoreJourneyState` | Shallow-restores form data, current step, substep, completed steps, and OTP flag. |
| `restoreFromApiData` | Maps backend application payloads back into frontend state and restore position. |
| `resetJourney` | Clears form data and progress state. |

## Restore mapping

`restoreFromApiData` maps backend states into frontend positions.

Backend `current_step` mapping:

| Backend current step | Frontend position |
| --- | --- |
| `LOGIN_INITIATE` | Step 0, `LOGIN_INITIATE` |
| `OTP_VERIFICATION` | Step 0, `OTP_VERIFICATION` |
| `BRANCH_SELECTION` | Step 0, `BRANCH_SELECTION` |
| `PERSONAL_DETAILS` | Step 2, `personal_detail` |
| `OCCUPATION_DETAILS` | Step 3, `orgnization_details` |
| `INCOME_DETAILS` | Step 3, `income_details` |
| `COAPP_DETAILS` | Step 3, `coapp_information` |
| `LOAN_DETAILS` | Step 4, `loan_requirement_details` |
| `LOAN_OFFER` | Step 5, `loan_offer_details` |
| `DOCUMENT_UPLOAD` | Step 6, `loan_document` |
| `LOAN_APPLICATION` | Step 6, `loan_application_submitted` |
| `SUBMITTED` | Step 6, `loan_application_submitted` |

Backend `section_id` fallback mapping:

| Backend section id | Frontend position |
| --- | --- |
| `request_otp` | Step 0, `LOGIN_INITIATE` |
| `validate_otp` | Step 0, `OTP_VERIFICATION` |
| `branch_selection` | Step 0, `BRANCH_SELECTION` |
| `pan_verification` | Step 1, `pan_verification` |
| `personal_detail` | Step 2, `personal_detail` |
| `orgnization_details` | Step 3, `orgnization_details` |
| `income_details` | Step 3, `income_details` |
| `coapp_information` | Step 3, `coapp_information` |
| `loan_requirement_details` | Step 4, `loan_requirement_details` |
| `loan_offer_details` | Step 5, `loan_offer_details` |
| `loan_document` | Step 6, `loan_document` |
| `loan_application_submitted` | Step 6, `loan_application_submitted` |
| `SUBMITTED` | Step 6, `loan_application_submitted` |

## Browser storage

`app/_lib/loanType.ts` builds storage keys from the backend loan type.

| Data | Key |
| --- | --- |
| Application id | `cosmos_loan_app_${loanType}` |
| Session auth flag | `cosmos_loan_app_${loanType}_auth` |
| Offer-reached flag | `cosmos_loan_app_${loanType}_offer_reached` |
| Journey draft | `cosmos_loan_app_${loanType}_draft` |
| Document draft | `loan-docs:${loanType}:${applicationId}` in IndexedDB |

The session auth flag is stored in `sessionStorage`, so a browser reload in the same session can restore directly. A browser close loses that flag, so the app sends the user back to auth and stores `targetStepIndex` for after re-auth.

## StepRenderer restore behavior

`StepRenderer` does the restore and draft work:

1. It derives `loanType` from `config.journeyType`, `config.type`, or pathname.
2. It reads the stored application id from localStorage.
3. It calls `useGetLoanApplicationQuery` unless restore should be skipped.
4. It restores API data through `restoreFromApiData`.
5. It restores local draft data on same-session reload when available.
6. It writes a sanitized draft after hydration.
7. It clears local state when the backend says the application is submitted or completed.

Restore is skipped when:

- `config.backendTenantId` is missing.
- no stored application id exists.
- Redux already has the same application id and the application is not submitted.
- `formData.is_submitted === true`.

If the backend returns offer data, the local draft `eligible_offer` is removed before merging so stale local offer values do not override API offer values.

## Progress bar behavior

`ThinDotsProgressBar` reads step definitions from `journeys[orgSlug][journeyType]`, not from Redux config.

Important behavior:

- It hides the progress dots while the user is still on step 0 and `otp_verified` is false.
- It shows the application id in the top bar after OTP verification when `formData.application_id` exists.
- It filters hidden steps by `isHidden`.
- It uses `completedStepIndices` and `currentStepIndex` for completed/active/pending styles.

## Public API hooks used by the journey

Defined in `app/_lib/redux/services/adminApiSlice.ts`.

| Hook | Endpoint | Used by |
| --- | --- | --- |
| `useGetCaptchaQuery` | `/auth/captcha` | `AuthStep` |
| `useProcessJourneyStepMutation` | `v1/loan/process-step` | All backend-writing journey steps |
| `useGetLoanApplicationQuery` | `v1/loan/application/{applicationId}` | `StepRenderer` restore |
| `useLazyGetLoanApplicationQuery` | `v1/loan/application/{applicationId}` | `AuthStep` identity restore |
| `useDownloadOfferLetterMutation` | `v1/loan/loan-offers` | Submitted screen in `EligibilityStep` |
| `useGetPublicStatesQuery` | `states/dropdown` | Auth, loan details, co-applicant |
| `useGetPublicDistrictsQuery` | `districts/dropdown?state=...` | Auth, loan details, co-applicant |
| `useGetPublicBranchesQuery` | `branches/dropdown?district=...` | Auth |
| `useGetPublicMasterValuesQuery` | `master-values/dropdown?call_type=...` | Personal, income, loan details |
| `useGetPublicLoanProductsQuery` | `loan-products-list` | Loan details |

For process-step calls, the RTK query adds:

- `X-Tenant-ID: config.backendTenantId`
- `X-API-Token` from `orgs` when configured

## Generic config-rendered steps

`CommonStep` and `UncommonStep` are fallbacks for steps without a registered custom component.

`CommonStep`:

- Renders `step.fields` with `FieldFactory`.
- Validates required fields.
- Applies mobile, email, and phone validation based on field name/label.
- Marks the current step complete and calls `nextStep`.
- Does not call the backend.

`UncommonStep`:

- Renders `step.fields` and `step.extraFields`.
- Applies the same client validation.
- Marks the current step complete and calls `nextStep`.
- Does not call the backend.

No active journey currently uses these fallbacks because every configured step has a registered `component`.
