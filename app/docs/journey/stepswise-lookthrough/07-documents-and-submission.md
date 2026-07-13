# Step 6: Documents And Submission

## Ownership

| Item | Value |
| --- | --- |
| Step index | `6` |
| Step id | `eligibility` |
| Label | `Documents` |
| Component key | `eligibility` |
| Component | `app/_components/journey/_steps/EligibilityStep.tsx` |
| Supporting files | `FieldFactory`, `documentDraftStorage`, `documentMapping`, `journeyDraft` |
| Primary APIs | `useProcessJourneyStepMutation`, `useDownloadOfferLetterMutation` |

This step uploads documents, submits the application, shows the submitted screen, clears local journey storage, and allows offer letter download.

## Internal substeps

This component has two user-facing states:

| State | Condition | Purpose |
| --- | --- | --- |
| Document upload | `formData.is_submitted` is false and local `submitted` is false | Collect and submit documents. |
| Submitted screen | `formData.is_submitted` is true or local `submitted` is true | Show application id, download offer letter, start new application. |

On submission, `showSubmittedScreen` restores Redux state to:

```ts
{
  formData: {
    is_submitted: true,
    application_id
  },
  currentStepIndex: finalStepIndex,
  currentSubStepKey: "loan_application_submitted",
  completedStepIndices: completed
}
```

## Config-driven document fields

The step config currently includes:

| Field | Type | Required | Options |
| --- | --- | --- | --- |
| `id_proof` | `file` | Yes | PAN Card, Aadhaar Card, Passport, Voter ID, Driving Licence |
| `address_proof` | `file` | Yes | Aadhaar Card, Passport, Voter ID, Utility Bill, Bank Statement, Driving Licence |
| `income_proof` | `file` | Yes | Latest ITR, Form 16 |

These are rendered through `FieldFactory` and `FileField`.

For file fields with options:

- user must select a document type first
- changing selected type clears the uploaded file
- selected type is stored as `${field.name}_type`

Accepted file UI text:

- PDF
- JPG/JPEG
- PNG
- max 5 MB

Note: The upload component displays max size but current validation does not enforce file size in this component.

## Always-required income documents

The document step always requires bank statement and salary slip uploads.

| Document | Default mode | Required key |
| --- | --- | --- |
| Bank statement, last 6 months | Consolidated | `bank_stmt_combined` |
| Salary slips, last 3 months | Consolidated | `salary_slip_combined` |

The component has state for split uploads:

- `bankConsolidated`
- `salaryConsolidated`

Both default to true. When false, required keys become:

- `bank_stmt_1` through `bank_stmt_6`
- `salary_slip_1` through `salary_slip_3`

Current UI does not expose toggles to change those booleans, so users normally see consolidated upload areas.

## Journey-specific additional documents

Additional required uploads depend on `config.type`.

| `config.type` | Required additional documents | Field keys |
| --- | --- | --- |
| `vehicle` | Pro-forma invoice / vehicle quotation | `vehicle_quotation` |
| `property-mortgage` | Registered sales deed / title deed; latest property tax receipt | `sales_deed`, `tax_receipt` |
| `education` | Admission letter / fee quotation; marksheets | `admission_letter`, `marksheets` |
| `home` | Agreement to sale / draft agreement; Index II / latest property card | `agreement_sale`, `property_card` |
| `personal` | None beyond base and income documents | none |

## Upload state

The component keeps local upload metadata in:

```ts
Record<string, UploadedFile>
```

`UploadedFile` can hold:

- `name`
- `size`
- `file`
- `extension`
- `isVirtual`
- `docType`
- `docSubType`
- `docPath`
- `docId`

`formData[fieldKey]` stores the file name for display and restore.

## Document type mapping

`getUploadDocumentMeta` maps frontend keys to backend document metadata.

| Frontend key | Backend `doc_type` | Backend `doc_sub_type` |
| --- | --- | --- |
| `id_proof` | selected type plus `_CARD`, or `IDENTITY_PROOF` | `IDENTITY_PROOF` |
| `address_proof` | selected type, or `ADDRESS_PROOF` | `ADDRESS_PROOF` |
| `income_proof` | selected type, or `INCOME_PROOF` | `INCOME_PROOF` |
| `bank_stmt_*` | `BANK_STATEMENT` | `INCOME_PROOF` |
| `salary_slip_*` | `SALARY_SLIP` | `INCOME_PROOF` |
| `vehicle_quotation` | `VEHICLE_QUOTATION` | `ASSET_PROOF` |
| `sales_deed` | `SALES_DEED` | `ASSET_PROOF` |
| `tax_receipt` | `TAX_RECEIPT` | `ASSET_PROOF` |
| `agreement_sale` | `AGREEMENT_SALE` | `ASSET_PROOF` |
| `property_card` | `PROPERTY_CARD` | `ASSET_PROOF` |
| `admission_letter` | `ADMISSION_LETTER` | `EDUCATION_PROOF` |
| `marksheets` | `MARKSHEETS` | `EDUCATION_PROOF` |
| any other key | uppercase key | `OTHER` |

When building the final payload, the component recalculates doc type for non-virtual files.

## Restore of documents

Documents can be restored from two places.

### Backend documents

`journeySlice.restoreFromApiData` normalizes backend documents through `normalizeBackendDocument`.

`EligibilityStep` then sees `formData.uploaded_documents` and creates virtual uploads:

- `file: null`
- `size: 0`
- `isVirtual: true`
- backend `docType`, `docSubType`, `filePath`, and `id`

Virtual uploads are sent back with empty `file_content`, `is_existing: true`, and existing path fields.

### IndexedDB document drafts

New local files are stored in IndexedDB through `documentDraftStorage.ts`.

Database:

- name: `cosmos_los_document_drafts`
- store: `document_drafts`
- index: `draftKey`

Draft key:

```ts
loan-docs:${loanType}:${applicationId}
```

When a file is uploaded:

- local `uploads[key]` is updated
- `formData[key]` is set to file name
- file blob and metadata are saved to IndexedDB

When a file is removed:

- local `uploads[key]` is deleted
- `formData[key]` is cleared
- IndexedDB draft record is deleted

## Offer summary and ROI preservation

If `formData.eligible_offer` exists and is not explicitly ineligible, the upload screen shows:

- sanctioned amount
- ROI
- tenure

ROI payload preservation:

The component extracts fixed/floating/canonical ROI values from `eligible_offer` and sends:

```ts
{
  roi,
  eligible_roi,
  roi_fixed_pct,
  roi_floating_pct
}
```

It ignores blank values and `"floating"` when choosing numeric ROI.

## Full application completeness guard

Before document validation, `checkFullApplicationCompleteness` requires prior-step basics:

| Area | Required data |
| --- | --- |
| Auth / branch | `branch`, `mobile` |
| Personal | `first_name`, `last_name`, `email`, `dob`, `gender`, `marital_status`, `perm_addr_line1`, `perm_pincode`, `perm_state`, `perm_district` |
| Income | `occupation`, and `monthly_income` unless occupation is `student` |

If missing, the user gets a toast naming the first missing field.

## Document validation

`validate` checks:

- required config file fields exist
- required config file fields with options also have `${field.name}_type`
- bank statement upload(s)
- salary slip upload(s)
- journey-specific documents

Errors are local to the component and the viewport scrolls to the first error.

## Submit process-step call

Triggered by "Submit Application".

If the current step is already completed, it shows the submitted screen without resubmitting.

For each upload, the component builds a document object:

```ts
{
  document_id,
  doc_type,
  doc_sub_type,
  file_name,
  file_extension,
  file_content,
  file_path,
  existing_file_path,
  is_existing,
  metadata: {
    document_number: formData.pan || "",
    expiry_date: null
  }
}
```

New files are converted to base64 with `FileReader`. Virtual/restored files send empty `file_content`.

Documents are deduplicated by `doc_type` and `file_name`. If a duplicate exists, a new upload with content replaces a virtual/empty entry.

Final process-step call:

```ts
{
  step_key: "DOCUMENT_UPLOAD",
  loan_type,
  payload: {
    application_id,
    section_id: "loan_document",
    roi,
    eligible_roi,
    roi_fixed_pct,
    roi_floating_pct,
    documents: uniqueDocuments
  }
}
```

On success:

- response application id is saved when present
- current step is marked complete
- submitted state is shown through `showSubmittedScreen`

On `422` errors:

- the component shows a toast asking the user to re-upload all documents

## Submitted-state cleanup

When submitted:

- localStorage application id is removed
- offer-reached flag is removed
- session auth key is removed
- legacy session-active key is removed
- journey draft is cleared
- document drafts are cleared from IndexedDB

This prevents a future reload from reopening the completed application in document upload.

## Submitted screen

The submitted screen displays:

- success state
- organization name from `orgs[config.orgSlug].name`
- application id from `responseId` or `formData.application_id`
- fallback random id starting with `COSWEB` if no id exists
- "Download Eligibility Offer Letter"
- "Start New Application"

## Offer letter download

Triggered by "Download Eligibility Offer Letter".

API hook:

```ts
useDownloadOfferLetterMutation
```

Payload:

```ts
{
  step_key: "LOAN_APPLICATION",
  loan_type,
  payload: {
    application_id,
    section_id: "loan_application_data",
    roi,
    eligible_roi,
    roi_fixed_pct,
    roi_floating_pct
  }
}
```

Expected response:

```ts
response.data.offer_letter_base64
```

The component creates a `data:application/pdf;base64,...` URL and downloads:

```txt
offer-letter-${applicationId || "download"}.pdf
```

## Start new application

The submitted screen's "Start New Application" button:

- removes localStorage application id
- removes offer-reached flag
- removes session auth key
- removes legacy session-active key
- clears journey draft
- clears document drafts
- dispatches `resetJourney`

## Common gotchas

- This component is named `EligibilityStep`, but it is currently the document upload and final submission step.
- The upload max-size copy is UI-only in this component.
- Split bank statement and split salary slip modes exist in state, but no visible toggle currently changes them.
- Virtual backend files are allowed; they send empty content with `is_existing: true`.
- Submission clears local restore keys so a completed application does not reopen on refresh.
