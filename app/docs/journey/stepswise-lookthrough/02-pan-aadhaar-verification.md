# Step 1: PAN And Optional Aadhaar Verification

## Ownership

| Item | Value |
| --- | --- |
| Step index | `1` |
| Step id | `pan-verification` |
| Label | `PAN Verification` |
| Component key | `aadhar_verification` |
| Component | `app/_components/journey/_steps/AadharStep.tsx` |
| Primary API | `useProcessJourneyStepMutation` |

Despite the component name, the active configured journey currently starts directly with PAN verification. Aadhaar input and Aadhaar OTP are config-gated.

## Config-controlled substeps

`AadharStep` checks the current step fields:

```ts
const hasAadharField = step.fields.some((field) => field.name === "aadhar_number");
```

If `aadhar_number` is present:

1. Aadhaar input substep.
2. Aadhaar OTP substep.
3. PAN substep.

If `aadhar_number` is absent:

1. PAN substep only.

Current `app/_config/journeys.ts` has `COMMON_FIELDS.aadhar_number` commented out, so the active flow skips Aadhaar and starts at PAN.

## Aadhaar input substep

Active only when `aadhar_number` is present in config.

Fields:

| Field | Validation | Notes |
| --- | --- | --- |
| `aadhar_number` | Exactly 12 digits | Input strips non-digits and slices to 12. |

If Aadhaar is already verified or the step is already completed, the field renders read-only with a verified badge.

## Aadhaar initiate process-step call

Triggered by "Request OTP".

```ts
{
  step_key: "PERSONAL_DETAILS",
  loan_type,
  payload: {
    application_id,
    aadhaar_number: formData.aadhar_number,
    section_id: "aadhaar_kyc_initiated"
  }
}
```

On success, `aadhaar_kyc_response.transId` is saved locally in component state and the UI moves to the Aadhaar OTP substep.

## Aadhaar OTP substep

Active only when Aadhaar is enabled.

Fields:

| Field | Validation | Notes |
| --- | --- | --- |
| `aadhar_otp` | Required six digits | Stored in Redux formData but stripped from journey draft persistence. |

The back button returns to Aadhaar input.

## Aadhaar OTP process-step call

Triggered by "Verify Aadhaar".

```ts
{
  step_key: "PERSONAL_DETAILS",
  loan_type,
  payload: {
    application_id,
    otp: formData.aadhar_otp,
    transId,
    section_id: "aadhaar_kyc_otp"
  }
}
```

On success, the component reads `response.data.aadhaar_kyc_response` and can prefill:

| Response field | Frontend field |
| --- | --- |
| `residentName` | split into `first_name`, `middle_name`, `last_name` |
| `dateOfBirth` | `dob`, converted from `DD-MM-YYYY` to `YYYY-MM-DD` |
| `gender` | `gender` (`M` to `male`, `F` to `female`, else `other`) |
| `houseName` | `perm_addr_line1` |
| `street` or `locality` | `perm_addr_line2` |
| `landmark` | `perm_addr_line3` |
| `villageTownCityName` or `districtName` | `perm_city` |
| `districtName` or `villageTownCityName` | `perm_district` |
| `stateName` | `perm_state` |
| `pinCode` | `perm_pincode` |

If backend `next_section === "pan_verification"`, the UI moves to PAN. Otherwise, the step is marked complete and moves to the next step.

## PAN substep

This is the active default substep.

Fields:

| Field | Validation | Notes |
| --- | --- | --- |
| `pan` | Exactly 10 characters | Input is uppercased and sliced to 10 characters. |

If PAN is already verified or the step is completed, the field renders read-only with a verified badge.

## PAN process-step call

Triggered by "Verify PAN".

```ts
{
  step_key: "PERSONAL_DETAILS",
  loan_type,
  payload: {
    application_id,
    pan,
    kyc_option: "ekyc",
    section_id: "pan_verification"
  }
}
```

On success:

- PAN response data may prefill applicant fields.
- `pan_verified` is set true.
- `application_data`, when returned, is passed to `syncWithApplicationData`.
- step 1 is marked complete.
- `nextStep()` moves to Personal Details.

## PAN response mapping

`response.data.pan_verification_response.data` is mapped as follows:

| Response field | Frontend field |
| --- | --- |
| `firstName`, `middleName`, `lastName` | `first_name`, `middle_name`, `last_name` |
| `fullName` | split into first/middle/last if individual fields are missing |
| `fatherName` | `middle_name` fallback |
| `dobOrDoi` | `dob` in `YYYY-MM-DD` and `pan_issue_date` as original value |
| `gender` | `gender` (`Male`/`M` to `male`, `Female`/`F` to `female`) |
| `email` | `email` fallback |
| `phone` | `mobile` only if mobile is not already captured |
| `pan` | `pan` |
| `maskedAadhaarNumber` | `masked_aadhaar` |
| address fields | permanent address fields |

The component also tries to read permanent address fields recursively from the full response using `findStringByKey`.

Credit score mapping:

- It tries to read `response.data.equifax_score_response.data.CCRResponse.CIRReportDataLst[0].CIRReportData.ScoreDetails[0].Value`.
- If found, it stores the value as `formData.score`.

## Age validation

If `dob` exists after PAN response mapping, `getAgeValidationError(dob, "Applicant")` is applied.

Valid applicant age:

- At least 18 years.
- Below 80 years.

If age validation fails, PAN and DOB are still stored, but the step does not advance.

## Loan type resolution

This component derives backend `loan_type` from pathname:

- `home-loan` to `HOME_LOAN`
- `vehicle-loan` to `VEHICLE_LOAN`
- `property-loan` or `property-mortgage` to `PROPERTY_MORTGAGE_LOAN`
- `education-loan` to `EDUCATION_LOAN`
- `personal-loan` to `PERSONAL_LOAN`

## Common gotchas

- Aadhaar substeps are not active unless `COMMON_FIELDS.aadhar_number` is included in this step's config.
- `aadhar_otp` is treated as volatile by `journeyDraft.ts`.
- PAN validation currently checks length only; format-level PAN regex validation is not implemented here.
- The component uses `middle_name`, while config still has a `mname` common field. The live UI and payloads use `middle_name`.
