# Journey Stepwise Lookthrough

This folder documents the public loan journey only. It does not cover the protected dashboard, admin app, reports, product configuration, maker-checker screens, or their APIs.

Start here when onboarding a developer to the application journey:

1. Read `00-runtime-and-state.md` for the route, configuration, Redux, restore, draft, progress, and API conventions.
2. Read the step file that matches the component being changed.
3. Check `app/_config/journeys.ts` before changing flow order or fields.
4. Check `app/_components/journey/step-registry.ts` before adding or renaming a custom step component.

## Active public journey flow

The configured Cosmos journeys currently use one shared `UNIFIED_STEPS` array. The route path decides the journey type, and `config.type` changes the behavior inside several shared step components.

| Index | Step id | Progress label | Component key | React component | Step doc |
| --- | --- | --- | --- | --- | --- |
| 0 | `authentication` | Branch Details | `authentication` | `AuthStep` | `01-branch-authentication.md` |
| 1 | `pan-verification` | PAN Verification | `aadhar_verification` | `AadharStep` | `02-pan-aadhaar-verification.md` |
| 2 | `individual-details` | Personal Details | `individual_details` | `IndividualDetailsStep` | `03-personal-details.md` |
| 3 | `income-details` | Income Details | `income_details` | `IncomeStep` | `04-income-and-coapplicant.md` |
| 4 | `loan-details` | Loan Details | `loan_details` | `LoanDetailsStep` | `05-loan-details.md` |
| 5 | `ekyc` | Offer | `ekyc` | `EkycStep` | `06-offer.md` |
| 6 | `eligibility` | Documents | `eligibility` | `EligibilityStep` | `07-documents-and-submission.md` |

## Active journey routes

Defined in `app/_config/journeys.ts` under `journeys.cosmos`:

| Route | `config.type` | Backend loan type |
| --- | --- | --- |
| `/cosmos/personal-loan` | `personal` | `PERSONAL_LOAN` |
| `/cosmos/vehicle-loan` | `vehicle` | `VEHICLE_LOAN` |
| `/cosmos/property-mortgage-loan` | `property-mortgage` | `PROPERTY_MORTGAGE_LOAN` |
| `/cosmos/education-loan` | `education` | `EDUCATION_LOAN` |
| `/cosmos/home-loan` | `home` | `HOME_LOAN` |

## Step keys and section ids

Most backend calls use `useProcessJourneyStepMutation`, which posts to `v1/loan/process-step` with this shape:

```ts
{
  step_key: string;
  loan_type: "PERSONAL_LOAN" | "HOME_LOAN" | "VEHICLE_LOAN" | "PROPERTY_MORTGAGE_LOAN" | "EDUCATION_LOAN";
  payload: {
    application_id?: string;
    section_id: string;
    // step-specific fields
  };
}
```

`step_key` is the backend workflow state. `payload.section_id` is the submitted subsection. On restore, `current_step` is preferred over `section_id`, because `section_id` usually means "last submitted action", not always "where the UI should open".

## Current implementation notes

- `COSMOS_PERSONAL_STEPS` has seven entries even though its file comment says six.
- `extraSteps` is configured but empty for all active journeys.
- The public route page and journey layout both initialize Redux config. The reducer keeps state when org, journey, and step count match.
- Progress dots are hidden until OTP is verified.
- Sensitive volatile values are not saved in the journey draft: `captcha`, `captcha_key`, `otp`, and `aadhar_otp`.
- Document file drafts are stored in IndexedDB, separate from the Redux/localStorage journey draft.
