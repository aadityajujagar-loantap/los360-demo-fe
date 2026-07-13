# Step 2: Personal Details

## Ownership

| Item | Value |
| --- | --- |
| Step index | `2` |
| Step id | `individual-details` |
| Label | `Personal Details` |
| Component key | `individual_details` |
| Component | `app/_components/journey/_steps/IndividualDetailsStep.tsx` |
| Primary API | `useProcessJourneyStepMutation` |

This step captures applicant personal, address, and demographic details. PAN verification usually prefills many of these fields, but the user can still fill or correct most fields.

## Internal substeps

The component has local `subStep` state with `"personal"` as the active implemented screen.

It also checks `currentSubStepKey` against optional configured `step.subSteps` keys:

- `stepConfig.subSteps.personal.stepKey`
- `stepConfig.subSteps.occupation.stepKey`

The active config does not define those substeps. In practice, this component renders only the personal/address screen. Occupation and income details live in `IncomeStep`.

## Master data used

All master data is lazy-loaded when the select opens or when a restored value already exists.

| Frontend options | Backend call type |
| --- | --- |
| `titleOptions` | `title` |
| `genderOptions` | `gender` |
| `maritalOptions` | `marital_status` |
| `religionOptions` | `community_religion` |
| `categoryOptions` | `category` |
| `ownershipOptions` | `permanent_residence_ownership` |
| `presentOwnershipOptions` | `present_residence_ownership` |

The mapping for each option prefers:

```ts
label = item.meta_value || item.name || item.label || item.value || item.id
value = item.meta_key || item.id || item.value || item.name || item
```

## Field groups

### Personal identity

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | Master dropdown. |
| `first_name` | Yes | Read-only if it was restored/prefilled and not touched manually. |
| `middle_name` | No | Read-only if restored/prefilled and untouched. |
| `last_name` | Yes | Read-only if restored/prefilled and untouched. |
| `mobile` | Yes | Displayed with `+91`; currently rendered without an `onChange` handler here, so auth owns edits. |
| `email` | Yes | Editable unless restored/prefilled and untouched. |
| `pan` | Yes | Read-only, comes from step 1. |
| `pan_issue_date` | No | Read-only when present. |
| `dob` | Yes | Date input. Age must be 18 or older and below 80. |

The component calculates age and displays years and months when DOB is valid.

### Permanent residential address

| Field | Required | Notes |
| --- | --- | --- |
| `perm_addr_line1` | Yes | Manual input. |
| `perm_addr_line2` | Yes | Manual input. |
| `perm_addr_line3` | No | Manual input. |
| `perm_state` | Yes | Text input in this step, not dropdown. |
| `perm_district` or `perm_city` | Yes | UI writes both `perm_district` and `perm_city` together. |
| `perm_pincode` | Yes | Manual input. |
| `perm_ownership` | Yes | Master dropdown. |
| `perm_country` | No | Read-only, defaults to `India`. |

Dependent fields for permanent ownership:

| Condition | Extra required fields |
| --- | --- |
| Ownership label/value includes both `rent` and `agreement` | `perm_resident_owned_by`, `perm_rent_per_month` |
| Ownership label/value is `other` or `others` | `perm_ownership_other_value` |

Changing `perm_ownership` clears:

- `perm_resident_owned_by`
- `perm_rent_per_month`
- `perm_ownership_other_value`

### Present residential address

Controlled by `same_address`, which defaults to `yes`.

| `same_address` value | Behavior |
| --- | --- |
| `yes` | UI displays "Same as permanent address"; payload copies permanent address to current address fields. |
| `no` | UI renders present address fields and validates them. |

Present address fields when different:

| Field | Required |
| --- | --- |
| `pres_addr_line1` | Yes |
| `pres_addr_line2` | Yes |
| `pres_addr_line3` | No |
| `pres_state` | Yes |
| `pres_district` or `pres_city` | Yes |
| `pres_pincode` | Yes |
| `pres_ownership` | Yes |
| `pres_country` | No, defaults to `India` |

Dependent fields for present ownership:

| Condition | Extra required fields |
| --- | --- |
| Ownership label/value includes both `rent` and `agreement` | `pres_resident_owned_by`, `pres_rent_per_month` |
| Ownership label/value is `other` or `others` | `pres_ownership_other_value` |

### Demographics

| Field | Required | Notes |
| --- | --- | --- |
| `gender` | Yes | Master dropdown. Payload maps `male` to `M`, `female` to `F`, otherwise `O`. |
| `marital_status` | Yes | Master dropdown. |
| `dependents` | No | Defaults to `0` in payload if empty. |
| `religion` | No in frontend validation | Master dropdown. |
| `category` | No in frontend validation | Master dropdown. |

## Pre-submit guard

Before validation, `checkAuthCompleteness` requires:

- `formData.branch`
- `formData.mobile`

If missing, a toast tells the user to return to the first step.

## Validation summary

`validatePersonal` checks:

- required identity fields
- email format
- Indian mobile format
- PAN presence
- permanent address fields
- permanent ownership dependents
- present address fields if `same_address !== "yes"`
- present ownership dependents
- gender and marital status
- applicant age

On validation failure:

- field errors are saved locally
- the viewport scrolls to the first field error
- a toast shows the most specific error, or a generic required-fields message

## Process-step call

Triggered by "Next".

The component skips the API when the step is already completed, but it still validates first.

```ts
{
  step_key: "PERSONAL_DETAILS",
  loan_type,
  payload: {
    application_id,
    section_id: "personal_detail",
    pan,
    email_id: email,
    gender: "M" | "F" | "O",
    dob,
    dob_in_months,
    no_of_dependents,
    marital_status,
    religion,
    category,

    perm_addr_1,
    perm_addr_2,
    perm_addr_3,
    perm_city,
    perm_pincode,
    perm_state,
    perm_country,
    perm_residence_ownership,
    perm_resident_owned_by,
    perm_rent_per_month,
    perm_residence_ownership_other_value,

    curr_addr_1,
    curr_address_2,
    curr_addr_3,
    curr_city,
    curr_pincode,
    curr_state,
    curr_country,
    curr_residence_ownership,
    curr_resident_owned_by,
    curr_rent_per_month,
    curr_residence_ownership_other_value
  }
}
```

Address payload rules:

- Permanent fields always come from `perm_*`.
- Current fields copy permanent values when `same_address === "yes"`.
- Current fields use `pres_*` when `same_address !== "yes"`.
- Rent and other-ownership payload fields are sent only when applicable; otherwise they are blank strings.

On success:

- `application_data`, when returned, is passed to `syncWithApplicationData`.
- current step is marked complete.
- `nextStep()` moves to Income Details.

On backend errors:

- `mapBackendFieldErrors` maps field errors and stores them locally.

## Restore behavior

`journeySlice.restoreFromApiData` can restore many fields into this step:

- `email_id` to `email`
- `pan_number` or `pan_no` to `pan`
- `date_of_birth` to `dob`
- permanent and current address fields
- `no_of_dependents` to `dependents`
- demographic fields

Date restore supports compact `YYYYMMDD` by converting it to `YYYY-MM-DD`.

## Common gotchas

- This component uses `middle_name`, not the config field `mname`.
- `perm_state` and `pres_state` are text inputs here, while branch and co-applicant use dropdowns.
- `religion` and `category` are displayed but are not currently required in `validatePersonal`.
- The component has a local `occupation` variable from `formData.occupation`, but occupation rendering is handled by the next step.
