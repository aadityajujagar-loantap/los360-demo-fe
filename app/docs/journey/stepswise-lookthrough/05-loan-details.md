# Step 4: Loan Details

## Ownership

| Item | Value |
| --- | --- |
| Step index | `4` |
| Step id | `loan-details` |
| Label | `Loan Details` |
| Component key | `loan_details` |
| Component | `app/_components/journey/_steps/LoanDetailsStep.tsx` |
| Primary API | `useProcessJourneyStepMutation` |

This step captures loan product, scheme, requested amount, repayment period, and product-specific collateral or asset information. It is a single UI step with conditional sections based on `config.type`.

## Master data and API data

| Data | Hook | Used for |
| --- | --- | --- |
| Loan products | `useGetPublicLoanProductsQuery` | Product and scheme dropdowns. |
| Purpose of loan | `useGetPublicMasterValuesQuery("purpose_of_loan")` | Personal, property mortgage, education. Skipped for home and vehicle. |
| Property type | `useGetPublicMasterValuesQuery("property_type")` | Property mortgage. |
| Study location | `useGetPublicMasterValuesQuery("study_location")` | Education. |
| Repayment method | `useGetPublicMasterValuesQuery("repayment_method")` | Education. |
| States | `useGetPublicStatesQuery` | Vehicle dealer state. |
| Districts | `useGetPublicDistrictsQuery(dealer_state)` | Vehicle dealer district. |

Dropdown options are normalized from `meta_value`, `name`, `label`, `value`, `id`, and `meta_key`.

## Loan product filtering

Products from `loan-products-list` are filtered by `config.type`:

| `config.type` | Product name match |
| --- | --- |
| `vehicle` | includes `auto`, `vehicle`, or `car` |
| `home` | includes `home`, `housing`, or token `hl` |
| `property-mortgage` | includes `property`, `mortgage`, or token `lap` |
| `education` | includes `education` or `study` |
| `personal` | includes `personal` |

When filtered products are available, the first matching product is auto-selected. If that product has schemes, the first scheme is also auto-selected.

Changing `loan_product` auto-selects that product's first scheme when present. Changing `loan_scheme` clears loan amount and product-specific property fields from local errors.

## Common fields

| Field | Required | Notes |
| --- | --- | --- |
| `loan_product` | Yes | Disabled when only one filtered product exists. |
| `loan_scheme` | Yes | From selected product's `schemes`. |
| `loan_amount` | Yes for non-home; yes for home after scheme is selected | Requested amount. |
| `repayment_period` | Yes for non-home; yes for home after scheme is selected | Months. |
| `loan_purpose` | Required when not home and not vehicle | For home and vehicle, backend purpose uses selected scheme name. |
| `overdraft_amount` | No | Sent as `"0"` when empty. |

For home journeys, common `loan_amount` and `repayment_period` are rendered inside the home property section after a scheme is selected.

## Personal loan behavior

Uses only the common fields:

- loan product
- loan scheme
- purpose of loan
- loan amount
- repayment period

Payload has no extra product-specific fields.

## Property mortgage behavior

Additional UI section: "Property Details (LAP)".

| Field | Required | Payload key |
| --- | --- | --- |
| `property_type` | Yes | `property_type` |
| `market_value` | Yes | `market_value` |
| `age_of_property` | Yes | `age_of_property` |
| `property_area` | No in validation | `property_area` |
| `remaining_period` | No | `remaining_period` |
| `outstanding_bal` | No | `outstanding_bal` |
| `property_address` | No in validation | `property_address` |

Note: The UI renders property area and address, but the current `validateLoan` requires only property type, market value, and age for property mortgage.

## Education loan behavior

Additional UI sections:

- "Course & Institution Details"
- "Financials & Security"

| Field | Required | Payload key |
| --- | --- | --- |
| `course_name` | Yes | `course_name` |
| `study_location` | Yes | `study_location` |
| `institute_name` | Yes | `institute_name` |
| `affiliated_institution` | No | `affiliated_institution` |
| `repayment_method` | Yes | `repayment_method` |
| `expected_future_income` | No | `expected_future_income` |
| `moratorium_period` | No | `moratorium_period` |
| `total_loan_period` | No | `total_loan_period` |
| `total_education_cost` | Yes | `total_education_cost` |
| `college_fees` | No | `college_fees` |
| `other_costs` | No | `other_costs` |
| `collateral_details` | No | `collateral_details` |
| `collateral_market_value` | No | `collateral_market_value` |

## Vehicle loan behavior

Additional UI sections:

- "Vehicle Details"
- "Vehicle Cost Breakup"
- "Dealer Address"
- "LTV Details"

| Field | Required | Payload key |
| --- | --- | --- |
| `vehicle_make_model` | Yes | `vehicle_make_model` |
| `showroom_price` | Yes | `showroom_price` |
| `rto_charges` | No | `rto_charges` |
| `other_accessories` | No | `other_accessories` |
| `insurance_cost` | No | `insurance_cost` |
| `asset_value` | Yes | `asset_value` |
| `dealer_name` | Yes | `dealer_name` |
| `dealer_address` | Yes | `dealer_address` |
| `dealer_state` | Yes | `dealer_state` |
| `dealer_district` | Yes | `dealer_district` |

Vehicle-specific validation:

- `asset_value` must be positive.
- `asset_value` must be at least the requested `loan_amount`.
- `own_contribution` is displayed as `asset_value - loan_amount` and is read-only.

## Home loan behavior

Home field rendering depends on selected scheme name.

Scheme detection:

| Detected scheme type | Match terms |
| --- | --- |
| Resale | `resale`, `old property`, `old house` |
| Construction | `construction`, `construct` |
| Improvement | `improv`, `repair`, `renovation`, `extension` |

Home property fields are shown when `config.type === "home"` and `loan_scheme` exists.

Required for all rendered home property flows:

| Field | Required | Notes |
| --- | --- | --- |
| `loan_amount` | Yes | Rendered as "Amount Required". |
| `repayment_period` | Yes | Months. |
| `agreement_cost` or `construction_value` | Yes | Which key is used depends on scheme. |
| `property_area` | Yes | Area of property. |
| `property_address` | Yes | Address of property. |

Cost field behavior:

| Scheme type | Frontend field | Label | Backend payload |
| --- | --- | --- | --- |
| Construction | `construction_value` | `Construction Value` | `agreement_cost: construction_value`, plus `construction_value` |
| Improvement | `agreement_cost` | `Estimated Cost of Improvement` | `agreement_cost` |
| Other/resale/new | `agreement_cost` | `Agreement Cost` | `agreement_cost` |

Additional required fields for resale:

- `market_value`
- `age_of_property`

## Process-step call

Triggered by "Calculate Eligibility".

```ts
{
  step_key: stepConfig?.subSteps?.loan?.stepKey || "LOAN_DETAILS",
  loan_type,
  payload: {
    application_id,
    section_id: "loan_requirement_details",
    loan_product,
    loan_scheme,
    loan_amount_requested: loan_amount || "0",
    loan_period_requested: String(Number(repayment_period || 0)),
    loan_purpose,
    overdraft_amount: overdraft_amount || "0",
    // product-specific fields
  }
}
```

On success:

- If `response.data.eligible_offer` exists, it is stored in `formData.eligible_offer`.
- `has_reached_eligibility_offer` is set true.
- step 4 is marked complete.
- `nextStep()` moves to Offer.

On backend validation errors:

- `err.data.errors` is merged into local `errors`.

## Offer-reaching side effect

`StepRenderer` stores the offer-reached flag when:

- `formData.application_id` exists
- `formData.loan_type` matches active loan type
- `currentStepIndex >= 5`
- application is not submitted

This is used during restore to bring users back to the offer screen after reaching eligibility.

## Common gotchas

- Do not add product-specific fields only to config and expect this step to render them automatically. This component is manually coded by `config.type`.
- Home loan no longer uses legacy `__legacyHomeLoanType`; current behavior is scheme-name driven.
- For home construction, backend receives `agreement_cost` equal to `construction_value`.
- For home and vehicle, `loan_purpose` sent to backend is the selected scheme label, not `formData.loan_purpose`.
- The EMI estimation block exists but is hidden in comments.
