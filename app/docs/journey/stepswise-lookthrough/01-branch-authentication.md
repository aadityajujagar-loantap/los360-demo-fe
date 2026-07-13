# Step 0: Branch Details And Authentication

## Ownership

| Item | Value |
| --- | --- |
| Step index | `0` |
| Step id | `authentication` |
| Label | `Branch Details` |
| Component key | `authentication` |
| Component | `app/_components/journey/AuthStep.tsx` |
| Config flags | `showNewUserToggle: true`, `needsCaptcha: true`, `needsOtp: true` |
| Primary API | `useProcessJourneyStepMutation` |

This step creates or resumes the backend loan application, verifies the applicant mobile through OTP, and saves the preferred branch. It is the only step that owns CAPTCHA, login OTP, and branch selection.

## Internal substeps

`AuthStep` uses a local `phase`:

| Phase | Backend/UI substep key | Purpose |
| --- | --- | --- |
| `input` | `LOGIN_INITIATE` or `request_otp` | Capture identity, declarations, CAPTCHA, and send OTP. |
| `otp` | `OTP_VERIFICATION` or `validate_otp` | Verify six-digit OTP. |
| `branch` | `BRANCH_SELECTION` or `branch_selection` | Select state, district, and branch. |

The current phase is derived from `phaseOverride`, `currentSubStepKey`, and stored `formData`. If `formData.otp_verified` is true, the component opens at branch selection.

## Input phase fields

Rendered fields and controls:

| Field | Required | Source | Notes |
| --- | --- | --- | --- |
| `is_new_user` | Yes | Static toggle | `yes` means new user; `no` means existing customer. Defaults to `yes`. |
| `customer_id` | Only existing user | Manual input | Required for existing customers. Must be 6 to 20 alphanumeric characters. |
| `mobile` | Yes | Manual input | Sanitized to 10 digits. Must start with 6, 7, 8, or 9. |
| `email` | Yes | Manual input | Must match frontend email regex. |
| `decl_no_defaulter` | Yes | Checkbox | Must be `yes`. |
| `decl_contact_consent` | Yes | Checkbox | Must be `yes`. |
| `decl_edu_consent` | Education only | Checkbox | Rendered only when `config.type === "education"`. Current validation does not block on it. |
| `is_category_belong` | Yes-like toggle | Toggle | If `yes`, online application is blocked and user is told to visit a branch. |
| `captcha` | Yes when configured | `/auth/captcha` | Case-sensitive. Verified locally with `bcrypt.compare` against `captcha_key`. |
| `captcha_key` | Hidden | CAPTCHA response | Stored in `formData` and sent to backend. |

CAPTCHA is skipped when OTP is already sent, OTP is verified, `otp_reference_id` exists, or the restore substep is already OTP/branch.

## Input validation

`validateInput` checks:

- Mobile number format.
- Email format.
- Existing customer `customer_id`.
- Required declarations.
- CAPTCHA value and CAPTCHA hash.

The field errors are stored in local component state, not Redux.

Changing `mobile` or `email` after an application was initiated clears:

- stored application id
- stored offer-reached flag
- session auth key
- local journey draft
- `application_id`
- `otp_reference_id`
- `otp_verified`
- `is_submitted`
- `has_reached_eligibility_offer`
- last initiated identity fields

## Send OTP process-step call

Triggered from input phase by `handleProceed`.

```ts
{
  step_key: stepConfig?.stepKey || "LOGIN_INITIATE",
  loan_type,
  captcha,
  captcha_key,
  payload: {
    is_existing_customer: formData.is_new_user === "no",
    account_number: customer_id when existing,
    mobile,
    email,
    loan_type,
    communication_consent: decl_contact_consent === "yes",
    not_npa_defaulter_flag: decl_no_defaulter === "yes",
    is_special_category: is_category_belong === "yes",
    section_id: "request_otp",
    application_id: currentJourneyApplicationId
  }
}
```

On success, the component stores:

- `application_id`
- `loan_type`
- `otp_reference_id`
- normalized `mobile`
- normalized `email`
- `last_initiated_mobile`
- `last_initiated_email`
- `last_initiated_loan_type`
- `otp_verified: false`
- `is_submitted: false`
- optional `first_name`, `middle_name`, `last_name`, `dob`, and `pan` from response

It also stores `application_id` in localStorage and sets the session auth flag in sessionStorage.

If an existing `application_id` already matches the same mobile, email, and loan type, the component avoids a duplicate send-OTP API call and moves directly to OTP phase.

## OTP phase behavior

OTP constants:

| Constant | Value |
| --- | --- |
| Validity | `300` seconds |
| Resend cooldown | `30` seconds |
| Max resend attempts | `3` |
| Max verify attempts | `5` |

The OTP input accepts digits only and maxes at 6 characters. The primary button is disabled until six digits are entered and OTP is neither expired nor locked.

The user can:

- change mobile number, which returns to input phase and clears OTP state
- resend OTP after cooldown, up to three attempts
- verify OTP

## Resend OTP process-step call

Triggered by `handleResendOtp`.

```ts
{
  step_key: stepConfig?.stepKey || "LOGIN_INITIATE",
  loan_type,
  captcha,
  captcha_key,
  payload: {
    is_existing_customer,
    account_number,
    mobile,
    email,
    loan_type,
    communication_consent,
    not_npa_defaulter_flag,
    is_special_category,
    section_id: "request_otp",
    application_id
  }
}
```

On success, `otp_reference_id` is refreshed and `otp` is cleared.

## Verify OTP process-step call

Triggered by OTP phase `handleProceed`.

```ts
{
  step_key: currentSubStepKey,
  loan_type,
  payload: {
    application_id,
    otp_reference_id,
    otp,
    section_id: "validate_otp"
  }
}
```

On success:

- resident name may be split into first/middle/last names
- `otp_verified` is set to true
- `isOtpSent` remains true
- `currentSubStepKey` moves to `BRANCH_SELECTION`
- session auth flag is set
- if a stored backend application is restored, `restoreFromApiData` merges it into Redux
- if `targetStepIndex` was set by restore, `nextStep` later jumps there

On OTP failure:

- backend field errors are mapped with `mapBackendFieldErrors`
- OTP failures increment `otpAttemptCount`
- after five OTP failures, OTP is locked until a new OTP is requested

## Branch phase fields

| Field | Required | Source |
| --- | --- | --- |
| `state` | Yes | `useGetPublicStatesQuery` |
| `district` | Yes | `useGetPublicDistrictsQuery(formData.state)` |
| `branch` | Yes | `useGetPublicBranchesQuery(formData.district)` |

Changing state clears district and branch. Changing district clears branch.

District values are normalized by replacing whitespace with underscores in the auth component.

## Branch process-step call

Triggered by branch phase `handleProceed`.

```ts
{
  step_key: stepConfig?.subSteps?.branch?.stepKey || "BRANCH_SELECTION",
  loan_type,
  payload: {
    application_id,
    state,
    district,
    branch,
    processing_center: "same as branch",
    section_id: "pan_verification"
  }
}
```

The `section_id` intentionally points to `pan_verification` so the backend advances the user to the next step.

On success:

- current step is marked complete
- `nextStep()` moves to step 1
- `isOtpSent` is set to false
- `application_data`, when returned, is passed to `syncWithApplicationData`

## Restore and session behavior

`AuthStep` participates in restore in these ways:

- It can restore phase from `currentSubStepKey`.
- It validates mobile/email identity before restoring a backend application.
- It clears application binding if identity mismatches.
- It uses `targetStepIndex` set by `journeySlice.restoreFromApiData` for browser-close re-auth flows.

Browser idle behavior:

- At 9 minutes of inactivity in input or OTP phase, a warning toast is shown.
- At 10 minutes, application binding and drafts are cleared, OTP state is reset, and the page reloads.

## Common gotchas

- Do not treat `is_new_user` as a boolean. Current values are string values `yes` and `no`.
- Do not store raw OTP or CAPTCHA in persistent drafts. `journeyDraft.ts` explicitly strips them.
- Branch selection does not expose a back button after OTP verification.
- Special-category users are intentionally blocked from online submission in this step.
- Email and mobile together identify a resumable application; changing either clears the binding.
