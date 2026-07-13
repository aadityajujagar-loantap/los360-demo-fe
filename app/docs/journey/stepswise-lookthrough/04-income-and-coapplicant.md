# Step 3: Income Details And Co-Applicants

## Ownership

| Item | Value |
| --- | --- |
| Step index | `3` |
| Step id | `income-details` |
| Label | `Income Details` |
| Component key | `income_details` |
| Main component | `app/_components/journey/_steps/IncomeStep.tsx` |
| Co-applicant component | `app/_components/journey/_steps/CoApplicantForm.tsx` |
| Primary API | `useProcessJourneyStepMutation` |

This step is internally split into occupation details, income assessment, and co-applicant information. It is one progress-bar step but three user-facing substeps.

## Internal substeps

| Local substep | Restore key | Backend step key fallback | Backend section id |
| --- | --- | --- | --- |
| `occupation` | `orgnization_details` | `OCCUPATION_DETAILS` | `orgnization_details` |
| `income` | `income_details` | `INCOME_DETAILS` | `income_assessment` |
| `coapplicant` | `coapp_information` | `COAPP_DETAILS` | `coapp_information` |

If `currentSubStepKey` is:

- `personal_detail` or `orgnization_details`, the component opens at occupation.
- `income_details`, it opens at income.
- `coapp_information`, it opens at co-applicant.

## Master data used

Lazy-loaded master values:

| Options | Backend call type | Used in |
| --- | --- | --- |
| `educationOptions` | `education` | Applicant and co-applicant education |
| `occupationOptions` | `occupation` | Applicant and co-applicant occupation |
| `employmentTypeOptions` | `employment_type` | Applicant service occupation only |
| `occupationTypeOptions` | `occupation_type` | Filtered by employment type for service occupation |
| `relationshipOptions` | `relationship_with_applicant` | Co-applicant relationship |
| `genderOptions` | `gender` | Co-applicant gender |
| `orgNatureOptions` | `nature_of_organization` | Applicant and co-applicant organization nature |
| `businessNatureOptions` | `business_nature` | Business occupations |
| `professionOptions` | `profession` | Professional/self-employed occupations |

Co-applicant form additionally loads:

- `title`
- `marital_status`
- `community_religion`
- `category`
- `permanent_residence_ownership`
- `present_residence_ownership`
- public states and districts

## Occupation substep

### Common fields

| Field | Required | Notes |
| --- | --- | --- |
| `occupation` | Yes | Drives conditional sections. |
| `education` | Yes | Highest education. |
| `current_qualification` | Education journey only | Required when `config.type === "education"`. |

### Service occupation

Active when `occupation.toLowerCase() === "service"`.

Required:

- `employment_type`
- `occupation_type`
- `employer_name`
- `org_nature`
- `work_exp`
- `service_remaining`
- `org_address`

Optional:

- `designation`
- `work_email`
- `office_phone`

Validation:

- `work_email` must be a valid email when present.
- `office_phone` must be 10 digits when present.
- `occupation_type` must be valid for the chosen `employment_type`.
- `retirement_age` is calculated as `work_exp + service_remaining`.

Occupation type filtering:

- `SELF_EMPLOYED`, `SELF_EMPLOYED_PROFESSIONAL`, `OTHER`, `RETIRED`, `SALARIED`, and `HOUSEWIFE` map to specific allowed `occupation_type` meta keys.
- The UI blocks submit if occupation types are still loading, failed to load, or do not match the selected employment type.

### Business occupation

Active when `occupation.toLowerCase() === "business"`.

Required:

- `org_name`
- `org_nature`
- `business_nature`
- `business_since`
- `org_address`

Optional:

- `business_email`

Validation:

- `business_since` must be in `MM/YYYY` format.
- `business_email` must be valid when present.

### Professional or self-employed occupation

Active when occupation is `professional` or `self_employed`.

Required:

- `profession`
- `org_nature`
- `org_name`
- `business_since`
- `org_address`

Optional:

- `business_email`

Validation is the same as business for `business_since` and `business_email`.

### Student occupation

Active when `occupation.toLowerCase() === "student"`.

Required:

- `institute_name`

## Occupation process-step call

Triggered by occupation substep "Next".

```ts
{
  step_key: "OCCUPATION_DETAILS",
  loan_type,
  payload: {
    application_id,
    section_id: "orgnization_details",
    educational_qualification: education,
    occupation,
    employment_type,
    occupation_type,
    employer_name,
    nature_of_org: org_nature,
    work_email,
    work_phone: office_phone,
    total_work_exp: work_exp,
    remaining_service_period: service_remaining,
    retirement_age,
    designation,
    org_address,
    business_email,
    business_nature,
    org_name,
    business_since,
    business_since_date,
    profession,
    institute_name,
    current_qualification
  }
}
```

On success, the component moves to the income substep. It does not mark the full step complete yet.

## Income substep

Fields:

| Field | Required | Notes |
| --- | --- | --- |
| `monthly_income` | Yes | Applicant gross monthly income. |
| `monthly_deduction` | Yes | Monthly deductions. |
| `existing_obligations` | Yes | Existing monthly obligations. |
| `tc_accepted` | Yes | Must be `yes`. |

The UI displays computed disposable income:

```ts
monthly_income - monthly_deduction - existing_obligations
```

## Income process-step call

Triggered by income substep "Save & Continue".

If the full step is already completed, the component skips the API and moves to co-applicant.

```ts
{
  step_key: stepConfig?.subSteps?.income?.stepKey || "INCOME_DETAILS",
  loan_type,
  payload: {
    ...formData,
    application_id,
    section_id: "income_assessment",
    avg_monthly_income: Number(monthly_income || 0),
    monthly_deduction: Number(monthly_deduction || 0),
    existing_monthly_obligations: Number(existing_obligations || 0),
    total_monthly_income,
    income_assessment_consent: tc_accepted === "yes"
  }
}
```

On success, the component moves to co-applicant.

## Co-applicant substep

Controlled by:

```ts
formData.has_co_applicant === "yes"
```

If enabled and no co-applicant exists, the UI creates an empty co-applicant object.

Maximum co-applicants:

```ts
config.maxCoApplicants || 5
```

The UI uses an accordion. `expandedIndices` controls open panels. Adding a co-applicant validates the existing one first.

## Co-applicant fields

### Personal

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | Master dropdown. |
| `first_name` | Yes | Manual input. |
| `middle_name` | No | Manual input. |
| `last_name` | Yes | Manual input. |
| `email` | Yes | Must be valid. |
| `phone` | Yes | Indian mobile validation. |
| `pan` | Yes | Read-only. Falls back to applicant PAN. |
| `relationship` | Yes | Master dropdown. |
| `gender` | No | Maps to `M`, `F`, or `O` in payload. |
| `marital_status` | Yes | Master dropdown. |
| `dob` | Yes | Age must be 18 or older and below 80. |
| `dependents` | No | Defaults to `0`. |
| `religion` | No | Master dropdown. |
| `category` | No | Master dropdown. |

### Address

Permanent address required:

- `perm_addr_line1`
- `perm_addr_line2`
- `perm_state`
- `perm_district` or `perm_city`
- `perm_pincode`
- `perm_ownership`

Present address is controlled by `same_address`.

If `same_address !== "yes"`, present address required:

- `pres_addr_line1`
- `pres_addr_line2`
- `pres_state`
- `pres_district` or `pres_city`
- `pres_pincode`
- `pres_ownership`

### Financial and employment

Always required:

- `avg_monthly_income`
- `monthly_deduction`
- `existing_monthly_obligations`
- `education`
- `occupation`

Occupation-specific required fields:

| Co-applicant occupation | Required fields |
| --- | --- |
| `service` | `employer_name`, `nature_of_org`, `total_work_exp`, `service_remaining`, `org_address` |
| `business` | `employer_name`, `nature_of_org`, `business_nature`, `business_since`, `org_address` |
| `professional` or `self_employed` | `profession`, `employer_name`, `nature_of_org`, `business_since`, `org_address` |

`business_since` must be `MM/YYYY`.

## Co-applicant process-step call

Triggered by "Complete Step".

If no co-applicant is selected, `coapplicants` is sent as an empty array.

```ts
{
  step_key: stepConfig?.subSteps?.coapplicant?.stepKey || "COAPP_DETAILS",
  loan_type,
  payload: {
    application_id,
    section_id: "coapp_information",
    coapplicants: coapplicantsInfo
  }
}
```

Each co-applicant payload includes:

- `applicant_type: "co-applicant"`
- name and relationship fields
- PAN as `pan` and `pan_number`
- DOB as `dob` and `date_of_birth`
- `dob_in_months`
- `email_id`
- sanitized `phone`
- demographic fields
- permanent and current address fields
- monthly income, deductions, obligations, and computed `total_monthly_income`
- education and occupation fields
- employment/business/profession fields
- `equifax_payload: {}`

On success:

- step 3 is marked complete
- `nextStep()` moves to Loan Details

## Backend error handling

All three substeps use `mapBackendFieldErrors`. Errors are saved locally and surfaced against frontend field keys.

## Common gotchas

- The backend section id is spelled `orgnization_details` in the code. Keep that spelling unless the backend changes.
- The applicant occupation substep does not mark the whole step complete; only the co-applicant submit does.
- Co-applicant PAN currently falls back to applicant PAN and is rendered read-only.
- `income_details` restore opens the income substep, but the income API sends `section_id: "income_assessment"`.
- `current_qualification` is required only for education journeys.
