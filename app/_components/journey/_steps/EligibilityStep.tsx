"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from "../../../_lib/redux/hooks";
import { 
  updateFormData as updateFormDataAction, 
  prevStep as prevStepAction,
  markStepComplete as markStepCompleteAction,
  resetJourney as resetJourneyAction,
  restoreJourneyState as restoreJourneyStateAction
} from "../../../_lib/redux/slices/journeySlice";
import {
  useDownloadOfferLetterMutation,
  useProcessJourneyStepMutation,
} from "../../../_lib/redux/services/adminApiSlice";
import { orgs } from "../../../_config/orgs";
import {
  getDocumentDraftKey,
  loadDocumentDrafts,
  saveDocumentDraft,
  deleteDocumentDraft,
  clearDocumentDrafts,
} from "../../../_lib/documentDraftStorage";
import { clearJourneyDraft } from "../../../_lib/journeyDraft";
import {
  getJourneyOfferReachedKey,
  getJourneySessionKey,
  getJourneyStorageKey,
  getLoanTypeFromJourney,
} from "../../../_lib/loanType";
import { scrollToFirstFieldError } from "../../../_hooks/useScrollToFieldError";
import StepCard from "../StepCard";
import {
  FormSelect,
  SectionHeader,
  SectionDivider,
  ToggleSwitch,
  PrimaryButton,
  SecondaryButton,
} from "../FormPrimitives";
import { FieldFactory } from "../../fields/FieldFactory";

const DocIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });

function firstPositiveRoiValue(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (!text || text.toLowerCase() === "floating") continue;

    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed > 0) return text;
  }
  return "";
}

type UploadedFile = { 
    name: string; 
    size: number; 
    file?: File | null;
    extension: string;
    isVirtual?: boolean;
    docType?: string;
    docSubType?: string;
    docPath?: string;
    docId?: string | number;
};

/** Single file upload area */
function UploadArea({
  label,
  fieldKey,
  uploaded,
  onUpload,
  required = true,
  error,
}: {
  label: string;
  fieldKey: string;
  uploaded?: UploadedFile;
  onUpload: (key: string, file?: UploadedFile) => void;
  required?: boolean;
  error?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    onUpload(fieldKey, { 
        name: f.name, 
        size: f.size, 
        file: f, 
        extension: ext 
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">
        {label}
        {required && (
          <span className="text-[var(--primary,#2e3192)] ml-1">*</span>
        )}
      </label>
      {uploaded ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-xs font-bold text-green-800">
                {uploaded.name}
              </p>
              <p className="text-[10px] text-green-600">
                {(uploaded.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpload(fieldKey)}
            className="text-[10px] font-bold text-red-400 hover:text-red-600"
          >
            Change
          </button>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? "border-[var(--primary,#2e3192)] bg-blue-50"
              : error
                ? "border-red-300 bg-red-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-[var(--accent,#2e3192)]">
              Click to upload
            </span>{" "}
            or drag &amp; drop
          </p>
          <p className="text-[10px] text-gray-400">PDF, JPG, PNG · Max 5 MB</p>
        </label>
      )}
      {error && (
        <p className="text-red-500 text-[11px] font-medium">{error}</p>
      )}
    </div>
  );
}

/** Multiple upload areas (for 6 individual salary slips etc.) */
function MultiUploadArea({
  label,
  count,
  prefix,
  uploads,
  onUpload,
  errors = {},
}: {
  label: string;
  count: number;
  prefix: string;
  uploads: Record<string, UploadedFile>;
  onUpload: (key: string, file?: UploadedFile) => void;
  errors?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold text-gray-600 tracking-wide uppercase">
        {label}
      </p>
      {Array.from({ length: count }).map((_, i) => (
        <UploadArea
          key={i}
          label={`Month ${i + 1}`}
          fieldKey={`${prefix}_${i + 1}`}
          uploaded={uploads[`${prefix}_${i + 1}`]}
          onUpload={onUpload}
          error={errors[`${prefix}_${i + 1}`]}
        />
      ))}
    </div>
  );
}


/**
 * EligibilityStep → repurposed as Document Upload (Step 6).
 */
const getUploadDocumentMeta = (key: string, selectedType?: string) => {
  if (key === "id_proof") {
    return {
      docType: selectedType ? `${selectedType.toUpperCase()}_CARD` : "IDENTITY_PROOF",
      docSubType: "IDENTITY_PROOF",
    };
  }
  if (key === "address_proof") {
    return {
      docType: selectedType ? selectedType.toUpperCase() : "ADDRESS_PROOF",
      docSubType: "ADDRESS_PROOF",
    };
  }
  if (key === "income_proof") {
    return {
      docType: selectedType ? selectedType.toUpperCase() : "INCOME_PROOF",
      docSubType: "INCOME_PROOF",
    };
  }
  if (key.startsWith("bank_stmt")) {
    return { docType: "BANK_STATEMENT", docSubType: "INCOME_PROOF" };
  }
  if (key.startsWith("salary_slip")) {
    return { docType: "SALARY_SLIP", docSubType: "INCOME_PROOF" };
  }
  if (["vehicle_quotation", "sales_deed", "tax_receipt", "agreement_sale", "property_card"].includes(key)) {
    return { docType: key.toUpperCase(), docSubType: "ASSET_PROOF" };
  }
  if (["admission_letter", "marksheets"].includes(key)) {
    return { docType: key.toUpperCase(), docSubType: "EDUCATION_PROOF" };
  }
  return { docType: key.toUpperCase(), docSubType: "OTHER" };
};

export default function EligibilityStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const {
    config,
    formData,
    currentStepIndex,
  } = useAppSelector((state) => state.journey);

  const updateFormData = (data: any) => dispatch(updateFormDataAction(data));
  const prevStep = () => dispatch(prevStepAction());
  const markStepComplete = (index: number) => dispatch(markStepCompleteAction(index));
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [uploads, setUploads] = useState<Record<string, UploadedFile>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [responseId, setResponseId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Toggle states
  const [bankConsolidated, setBankConsolidated] = useState(true); 
  const [salaryConsolidated, setSalaryConsolidated] = useState(true);

  const { completedStepIndices } = useAppSelector((state) => state.journey);

  const set = (key: string, val: any) => updateFormData({ [key]: val });
  const [downloadOfferLetter] = useDownloadOfferLetterMutation();

  const loanType = getLoanTypeFromJourney({
    journeyType: config?.journeyType,
    configType: config?.type,
    pathname,
  });
  const storageKey = getJourneyStorageKey(loanType);
  const sessionKey = getJourneySessionKey(loanType);
  const offerReachedKey = getJourneyOfferReachedKey(loanType);
  const documentDraftKey = getDocumentDraftKey(loanType, formData.application_id);
  const isSubmitted = formData.is_submitted || submitted;
  const offer = formData.eligible_offer || {};
  const offerRoiType = String(offer.roi_type || offer.interest_type || "").toLowerCase();
  const canonicalOfferRoiValue = firstPositiveRoiValue(offer.roi, offer.eligible_roi);
  const offerRoiFixedValue = firstPositiveRoiValue(
    offer.roi_fixed_pct,
    offer.roi_fixed,
    offer.fixed_roi,
    offerRoiType === "floating" ? undefined : canonicalOfferRoiValue,
  );
  const offerRoiFloatingValue = firstPositiveRoiValue(
    offer.roi_floating_pct,
    offer.roi_floating,
    offer.floating_roi,
    offerRoiType === "floating" ? canonicalOfferRoiValue : undefined,
  );
  const offerRoiValue = firstPositiveRoiValue(
    canonicalOfferRoiValue,
    offerRoiFixedValue,
    offerRoiFloatingValue,
  );
  const offerRoiPayload = {
    roi: offerRoiValue || null,
    eligible_roi: offerRoiValue || null,
    roi_fixed_pct: offerRoiFixedValue || null,
    roi_floating_pct: offerRoiFloatingValue || null,
  };

  const showSubmittedScreen = (applicationId?: string) => {
    const finalStepIndex = Math.max(0, (config?.steps?.length || currentStepIndex + 1) - 1);
    const completed = Array.from(
      new Set([...completedStepIndices, finalStepIndex, currentStepIndex]),
    );

    dispatch(
      restoreJourneyStateAction({
        formData: {
          is_submitted: true,
          ...(applicationId ? { application_id: applicationId } : {}),
        },
        currentStepIndex: finalStepIndex,
        currentSubStepKey: "loan_application_submitted",
        completedStepIndices: completed,
      }),
    );
    setSubmitted(true);
  };

  useEffect(() => {
    if (isSubmitted) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(offerReachedKey);
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`${storageKey}_session_active`);
      clearJourneyDraft(loanType);
      clearDocumentDrafts(documentDraftKey).catch((err) => {
        console.warn("Failed to clear document drafts", err);
      });
    }
  }, [documentDraftKey, isSubmitted, loanType, offerReachedKey, sessionKey, storageKey]);

  // Hydrate local uploads state from restored backend documents and saved draft files.
  // Backend documents are virtual uploads; IndexedDB drafts retain actual file content across reloads.
  useEffect(() => {
    // List of keys we track for documents
    const mapping: Record<string, { subType: string; typeAttr?: string }> = {
      id_proof: { subType: "IDENTITY_PROOF", typeAttr: "id_proof_type" },
      address_proof: { subType: "ADDRESS_PROOF", typeAttr: "address_proof_type" },
      income_proof: { subType: "INCOME_PROOF", typeAttr: "income_proof_type" },
      bank_stmt_combined: { subType: "INCOME_PROOF" },
      salary_slip_combined: { subType: "INCOME_PROOF" },
      vehicle_quotation: { subType: "ASSET_PROOF" },
      sales_deed: { subType: "ASSET_PROOF" },
      tax_receipt: { subType: "ASSET_PROOF" },
      admission_letter: { subType: "EDUCATION_PROOF" },
      marksheets: { subType: "EDUCATION_PROOF" },
      agreement_sale: { subType: "ASSET_PROOF" },
      property_card: { subType: "ASSET_PROOF" }
    };

    setUploads(prev => {
        let changed = false;
        const next = { ...prev };

        if (Array.isArray(formData.uploaded_documents)) {
            formData.uploaded_documents.forEach((doc: any) => {
                const key = doc.fieldKey;
                if (!key || next[key]) return;

                next[key] = {
                    name: doc.fileName || "Uploaded File",
                    size: 0,
                    file: null,
                    extension: doc.fileExtension || doc.fileName?.split(".").pop() || "",
                    isVirtual: true,
                    docType: doc.docType,
                    docSubType: doc.docSubType,
                    docPath: doc.filePath,
                    docId: doc.id,
                };
                changed = true;
            });
        }

        Object.entries(mapping).forEach(([key, meta]) => {
            if (formData[key] && typeof formData[key] === "string" && !next[key]) {
                // Infer docType (e.g. from id_proof_type)
                let docType = key.toUpperCase();
                if (meta.typeAttr && formData[meta.typeAttr]) {
                    const typeVal = formData[meta.typeAttr].toUpperCase();
                    docType = meta.subType === "IDENTITY_PROOF" ? `${typeVal}_CARD` : typeVal;
                }

                next[key] = {
                    name: formData[key],
                    size: 0,
                    file: null,
                    extension: formData[key].split(".").pop() || "",
                    isVirtual: true,
                    docType: docType,
                    docSubType: meta.subType
                };
                changed = true;
            }
        });
        return changed ? next : prev;
    });
  }, [formData]);

  useEffect(() => {
    if (!documentDraftKey || isSubmitted) return;

    let cancelled = false;

    loadDocumentDrafts(documentDraftKey)
      .then((drafts) => {
        if (cancelled || Object.keys(drafts).length === 0) return;

        const restoredUploads: Record<string, UploadedFile> = {};
        const restoredFormData: Record<string, string> = {};

        Object.entries(drafts).forEach(([key, draft]) => {
          if (uploads[key]) return;

          restoredUploads[key] = {
            name: draft.name,
            size: draft.size,
            file: draft.file,
            extension: draft.extension,
            docType: draft.docType,
            docSubType: draft.docSubType,
          };
          restoredFormData[key] = draft.name;
          if (["id_proof", "address_proof", "income_proof"].includes(key) && draft.docType) {
            restoredFormData[`${key}_type`] = draft.docType
              .replace(/_CARD$/, "")
              .toLowerCase();
          }
        });

        if (Object.keys(restoredUploads).length > 0) {
          setUploads((prev) => ({ ...prev, ...restoredUploads }));
        }
        if (Object.keys(restoredFormData).length > 0) {
          updateFormData(restoredFormData);
        }
      })
      .catch((err) => {
        console.warn("Failed to restore document draft", err);
      });

    return () => {
      cancelled = true;
    };
  }, [documentDraftKey, isSubmitted, uploads]);

  const handleUpload = (key: string, file?: UploadedFile) => {
    if (!file) {
      setUploads((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      updateFormData({ [key]: "" });
      deleteDocumentDraft(documentDraftKey, key).catch((err) => {
        console.warn("Failed to delete document draft", err);
      });
    } else {
      const fallbackMeta = getUploadDocumentMeta(key);
      const nextFile = {
        ...file,
        docType: file.docType || fallbackMeta.docType,
        docSubType: file.docSubType || fallbackMeta.docSubType,
      };

      setUploads((p) => ({ ...p, [key]: nextFile }));
      updateFormData({ [key]: nextFile.name });
      if (nextFile.file) {
        saveDocumentDraft(documentDraftKey, key, nextFile.file, {
          docType: nextFile.docType,
          docSubType: nextFile.docSubType,
          extension: nextFile.extension,
        }).catch((err) => {
          console.warn("Failed to save document draft", err);
        });
      }
      setErrors((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const hasValue = (value: unknown) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    };
    const hasUpload = (key: string) => hasValue(uploads[key]) || hasValue(formData[key]);
    const requireUpload = (key: string, label: string) => {
      if (!hasUpload(key)) e[key] = `${label} is required`;
    };
    const step = config?.steps?.[currentStepIndex];
    step?.fields?.forEach((f) => {
      const fieldValue = f.type === "file" ? uploads[f.name] || formData[f.name] : formData[f.name];
      if (f.required && !hasValue(fieldValue)) {
        e[f.name] = `${f.label} is required`;
      } else if (
        f.required &&
        f.type === "file" &&
        f.options?.length &&
        !hasValue(formData[`${f.name}_type`])
      ) {
        e[f.name] = `Select ${f.label} type`;
      }
    });
    if (bankConsolidated) {
      requireUpload("bank_stmt_combined", "Combined 6-month bank statement");
    } else {
      Array.from({ length: 6 }).forEach((_, i) => {
        requireUpload(`bank_stmt_${i + 1}`, `Bank statement month ${i + 1}`);
      });
    }
    if (salaryConsolidated) {
      requireUpload("salary_slip_combined", "Combined 3-month salary slips");
    } else {
      Array.from({ length: 3 }).forEach((_, i) => {
        requireUpload(`salary_slip_${i + 1}`, `Salary slip month ${i + 1}`);
      });
    }
    if (config?.type === "vehicle") {
      requireUpload("vehicle_quotation", "Pro-forma invoice / vehicle quotation");
    }
    if (config?.type === "property-mortgage") {
      requireUpload("sales_deed", "Registered sales deed / title deed");
      requireUpload("tax_receipt", "Latest property tax receipt");
    }
    if (config?.type === "education") {
      requireUpload("admission_letter", "Admission letter / fee quotation");
      requireUpload("marksheets", "Marksheets");
    }
    if (config?.type === "home") {
      requireUpload("agreement_sale", "Agreement to sale / draft agreement");
      requireUpload("property_card", "Index II / latest property card");
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      return false;
    }
    return true;
  };

  const checkFullApplicationCompleteness = () => {
    const missing: string[] = [];
    
    // Auth / Branch Section
    if (!formData.branch) missing.push("Disbursement Branch");
    if (!formData.mobile) missing.push("Mobile Number");
    
    // Personal Details
    if (!formData.first_name || !formData.last_name) missing.push("Full Name");
    if (!formData.email) missing.push("Email Address");
    if (!formData.dob) missing.push("Date of Birth");
    if (!formData.gender) missing.push("Gender");
    if (!formData.marital_status) missing.push("Marital Status");
    if (!formData.perm_addr_line1) missing.push("Permanent Address Line 1");
    if (!formData.perm_pincode) missing.push("Address Pincode");
    if (!formData.perm_state || !formData.perm_district) missing.push("Address State/District");
    
    // Income / Employment (Basic checks)
    if (!formData.occupation) missing.push("Occupation");
    if (!formData.monthly_income && formData.occupation !== "student") missing.push("Monthly Income");
    
    return missing;
  };

  const handleSubmit = async () => {
    // Check overall journey completeness (for missing data in prev steps)
    const missingFields = checkFullApplicationCompleteness();
    if (missingFields.length > 0) {
      toast.error(`Missing required data: ${missingFields[0]}. Please go back and fill it.`, {
        duration: 4000,
        position: "top-center"
      });
      return;
    }

    if (!validate()) return;
    if (completedStepIndices.includes(currentStepIndex)) {
      showSubmittedScreen();
      return;
    }
    setIsLoading(true);
    try {
      const backendTenantId = config?.backendTenantId || "";
      const currentStepKey = "DOCUMENT_UPLOAD"; 

      // Build the documents array
      const documentsPromises = Object.entries(uploads).map(async ([key, upload]) => {
          let docType = upload.docType || key.toUpperCase();
          let docSubType = upload.docSubType || "OTHER";

          // Recalculate types for new uploads (non-virtual)
          if (!upload.isVirtual) {
              if (key === "id_proof") {
                  const selectedType = formData["id_proof_type"];
                  docType = selectedType ? selectedType.toUpperCase() + "_CARD" : "IDENTITY_PROOF";
                  docSubType = "IDENTITY_PROOF";
              } else if (key === "address_proof") {
                  const selectedType = formData["address_proof_type"];
                  docType = selectedType ? selectedType.toUpperCase() : "ADDRESS_PROOF";
                  docSubType = "ADDRESS_PROOF";
              } else if (key === "income_proof") {
                  const selectedType = formData["income_proof_type"];
                  docType = selectedType ? selectedType.toUpperCase() : "INCOME_PROOF";
                  docSubType = "INCOME_PROOF";
              } else if (key.startsWith("bank_stmt")) {
                  docType = "BANK_STATEMENT";
                  docSubType = "INCOME_PROOF";
              } else if (key.startsWith("salary_slip")) {
                  docType = "SALARY_SLIP";
                  docSubType = "INCOME_PROOF";
              } else if (["vehicle_quotation", "sales_deed", "tax_receipt", "agreement_sale", "property_card"].includes(key)) {
                  docSubType = "ASSET_PROOF";
              } else if (["admission_letter", "marksheets"].includes(key)) {
                  docSubType = "EDUCATION_PROOF";
              }
          }

          // For virtual files, we don't have the content, so we send empty string
          // The backend should recognize it's already there
          const base64Content = upload.file ? await toBase64(upload.file) : "";

          return {
              document_id: upload.docId,
              doc_type: docType,
              doc_sub_type: docSubType,
              file_name: upload.name,
              file_extension: upload.extension,
              file_content: base64Content,
              file_path: upload.docPath,
              existing_file_path: upload.docPath,
              is_existing: upload.isVirtual === true,
              metadata: {
                  document_number: formData.pan || "",
                  expiry_date: null
              }
          };
      });

      const documents = await Promise.all(documentsPromises);

      // Deduplicate the documents array to prevent the backend from creating duplicate entries.
      // We prioritize new uploads (with file_content) over virtual ones.
      const uniqueDocuments = documents.reduce((acc: any[], current) => {
          const existingIndex = acc.findIndex(d => d.doc_type === current.doc_type && d.file_name === current.file_name);
          if (existingIndex === -1) {
              acc.push(current);
          } else if (current.file_content && !acc[existingIndex].file_content) {
              // Replace the virtual/empty entry with the one that has actual content
              acc[existingIndex] = current;
          }
          return acc;
      }, []);

      const res = await processJourneyStep({
        tenantId: backendTenantId,
        data: {
           step_key: currentStepKey,
           loan_type: loanType,
           payload: {
               application_id: formData.application_id,
               section_id: "loan_document",
               ...offerRoiPayload,
               documents: uniqueDocuments
           }
        }
      }).unwrap();
      
      const submittedApplicationId = res?.data?.application_id
        ? String(res.data.application_id)
        : formData.application_id
          ? String(formData.application_id)
          : "";

      if (submittedApplicationId) {
          setResponseId(submittedApplicationId);
      }

      markStepComplete(currentStepIndex);
      showSubmittedScreen(submittedApplicationId);

      // ── Clear stored app ID immediately ──────────────────────────────────────
      // Storage is cleared by the submitted-state effect so reload starts fresh.
      // ────────────────────────────────────────────────────────────────────────
    } catch (err: any) {
      console.error("Failed Document Upload phase", err);
      if (err?.status === 422 || err?.data?.status_code === 422) {
          toast.error("Please re-upload all documents to continue.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Download offer letter ── */
  const handleDownloadOffer = async () => {
    setIsDownloading(true);
    try {
      const appId = responseId || formData.application_id || "";

      // We use the dedicated offer-letter endpoint. 
      // The backend returned next_section: "loan_application_data" after document upload, 
      // so we use that instead of the previous "loan_application_submitted".
      const offerRes = await downloadOfferLetter({
        step_key: "LOAN_APPLICATION",
        loan_type: loanType,
        payload: {
          application_id: appId,
          section_id: "loan_application_data",
          ...offerRoiPayload,
        },
      }).unwrap();

      const offerLetterBase64 = offerRes?.data?.offer_letter_base64 || "";

      if (!offerLetterBase64) {
        throw new Error("Offer letter data missing from response");
      }

      const url = `data:application/pdf;base64,${offerLetterBase64}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `offer-letter-${appId || "download"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error("Failed to download offer letter", err);
      alert("Could not download the offer letter. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  /* ── Success screen ── */
  if (isSubmitted) {
    const appId = responseId || formData.application_id || "COSWEB" + Math.floor(1000000000 + Math.random() * 9000000000).toString();

    return (
      <StepCard noHeader>
        <div className="flex flex-col items-center py-6 text-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl animate-bounce"
            style={{ backgroundColor: "var(--primary, #2e3192)" }}
          >
            🎉
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
              Loan Application Submitted
            </h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed max-w-lg mx-auto">
              Thanks for Loan Enquiry with {orgs[config?.orgSlug as string]?.name ?? "our Bank"}. Your loan application
              has been successfully submitted and your application ID is{" "}
              <span className="font-bold text-[var(--accent,#2e3192)]">
                {appId}
              </span>
              . Please visit the selected branch for further loan processing.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleDownloadOffer}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl border-2 border-[var(--primary,#2e3192)] text-[var(--primary,#2e3192)] font-bold hover:bg-blue-50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              )}
              {isDownloading ? "Downloading..." : "Download Eligibility Offer Letter"}
            </button>

            <button
              onClick={() => {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(offerReachedKey);
                sessionStorage.removeItem(sessionKey);
                sessionStorage.removeItem(`${storageKey}_session_active`);
                clearJourneyDraft(loanType);
                clearDocumentDrafts(documentDraftKey).catch((err) => {
                  console.warn("Failed to clear document drafts", err);
                });
                dispatch(resetJourneyAction());
              }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 hover:underline"
            >
              Start New Application
            </button>
          </div>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard
      title="Document Upload"
      subtitle="Upload required documents to complete your application"
      icon={<DocIcon />}
    >
      <div className="space-y-6">
        {/* Loan Offer Summary Highlight (for reloads) */}
        {formData.eligible_offer && (formData.eligible_offer.eligible !== false || !!formData.eligible_offer.eligible_loan_amount) && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Eligible Loan Offer</p>
              <h3 className="text-lg font-black text-green-900">₹{parseFloat(String(formData.eligible_offer.sanction_amount || "0").replace(/,/g, "")).toLocaleString("en-IN")}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-green-800">{offerRoiValue ? `${offerRoiValue}% p.a.` : "—"}</p>
              <p className="text-[10px] text-green-600 font-medium">{formData.eligible_offer.tenure || formData.eligible_offer.eligible_tenure} Months</p>
            </div>
          </div>
        )}

        {/* Render config-driven fields (Document Uploads with Dropdowns) */}
        {config?.steps && config.steps[currentStepIndex]?.fields?.length > 0 && (
           <div className="space-y-6">
              {config.steps[currentStepIndex].fields
                .filter((f: any) => !["bank_stmt_combined", "salary_slip_combined"].includes(f.name))
                .map((field: any) => {
                 const currentFile = uploads[field.name];
                 const currentTypeKey = `${field.name}_type`;
                 const selectedType = formData[currentTypeKey];

                 return (
                    <div key={field.name} className="animate-in fade-in slide-in-from-top-2">
                       <FieldFactory
                          field={{
                             ...field,
                             selectedType: selectedType,
                             onTypeChange: (type: string) => {
                                set(currentTypeKey, type);
                                // Clear file if type changes
                                handleUpload(field.name);
                             }
                          }}
                          value={currentFile}
                          onChange={(file: File) => {
                             if (file) {
                                const ext = file.name.split(".").pop()?.toLowerCase() || "";
                                const meta = getUploadDocumentMeta(field.name, selectedType);
                                handleUpload(field.name, {
                                   name: file.name,
                                   size: file.size,
                                   file: file,
                                   extension: ext,
                                   docType: meta.docType,
                                   docSubType: meta.docSubType,
                                });
                             }
                          }}
                          error={errors[field.name]}
                       />
                       <SectionDivider className="mt-6" />
                    </div>
                 );
              })}
           </div>
        )}

        {/* ── Bank Statement (6 months) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader
              title="Bank Statement — Last 6 Months"
              className="mb-0"
            />
          </div>

          {bankConsolidated ? (
            <UploadArea
              label="Upload Combined 6-Month Statement"
              fieldKey="bank_stmt_combined"
              uploaded={uploads["bank_stmt_combined"]}
              onUpload={handleUpload}
              error={errors.bank_stmt_combined}
            />
          ) : (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <MultiUploadArea
                label="Upload Individual Monthly Statements"
                count={6}
                prefix="bank_stmt"
                uploads={uploads}
                onUpload={handleUpload}
                errors={errors}
              />
            </div>
          )}
        </div>

        <SectionDivider />

        {/* ── Salary Slips (3 months) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader
              title="Salary Slips — Last 3 Months"
              className="mb-0"
            />
          </div>

          {salaryConsolidated ? (
            <UploadArea
              label="Upload Combined 3-Month Salary Slips"
              fieldKey="salary_slip_combined"
              uploaded={uploads["salary_slip_combined"]}
              onUpload={handleUpload}
              error={errors.salary_slip_combined}
            />
          ) : (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <MultiUploadArea
                label="Upload Individual Monthly Salary Slips"
                count={3}
                prefix="salary_slip"
                uploads={uploads}
                onUpload={handleUpload}
                errors={errors}
              />
            </div>
          )}
        </div>

        {/* ── Journey-Specific Documents (Legacy Fallback) ── */}
        {(config?.type === "vehicle" || config?.type === "education" || config?.type === "home" || config?.type === "property-mortgage") && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mb-4">Additional Assets &amp; Proofs</p>
                <div className="space-y-4">
                    {config?.type === "vehicle" && (
                        <UploadArea
                            label="Pro-forma Invoice / Vehicle Quotation"
                            fieldKey="vehicle_quotation"
                            uploaded={uploads["vehicle_quotation"]}
                            onUpload={handleUpload}
                            error={errors.vehicle_quotation}
                        />
                    )}
                    {config?.type === "property-mortgage" && (
                        <>
                            <UploadArea
                                label="Registered Sales Deed / Title Deed"
                                fieldKey="sales_deed"
                                uploaded={uploads["sales_deed"]}
                                onUpload={handleUpload}
                                error={errors.sales_deed}
                            />
                            <UploadArea
                                label="Latest Property Tax Receipt"
                                fieldKey="tax_receipt"
                                uploaded={uploads["tax_receipt"]}
                                onUpload={handleUpload}
                                error={errors.tax_receipt}
                            />
                        </>
                    )}
                    {config?.type === "education" && (
                        <>
                            <UploadArea
                                label="Admission Letter / Fee Quotation"
                                fieldKey="admission_letter"
                                uploaded={uploads["admission_letter"]}
                                onUpload={handleUpload}
                                error={errors.admission_letter}
                            />
                            <UploadArea
                                label="Marksheets (10th/12th/Graduation)"
                                fieldKey="marksheets"
                                uploaded={uploads["marksheets"]}
                                onUpload={handleUpload}
                                error={errors.marksheets}
                            />
                        </>
                    )}
                    {config?.type === "home" && (
                        <>
                            <UploadArea
                                label="Agreement to Sale / Draft Agreement"
                                fieldKey="agreement_sale"
                                uploaded={uploads["agreement_sale"]}
                                onUpload={handleUpload}
                                error={errors.agreement_sale}
                            />
                            <UploadArea
                                label="Index II / Latest Property Card"
                                fieldKey="property_card"
                                uploaded={uploads["property_card"]}
                                onUpload={handleUpload}
                                error={errors.property_card}
                            />
                        </>
                    )}
                </div>
            </div>
        )}

        <div className="flex gap-4 pt-2">
            {!(formData.eligible_offer?.eligible !== false || !!formData.eligible_offer?.eligible_loan_amount) && (
              <SecondaryButton onClick={prevStep} className="flex-1">
                ← Back
              </SecondaryButton>
            )}
            <div className={(formData.eligible_offer?.eligible !== false || !!formData.eligible_offer?.eligible_loan_amount) ? "flex-1" : "flex-[2]"}>
                <PrimaryButton onClick={handleSubmit} isLoading={isLoading}>
                    Submit Application
                </PrimaryButton>
            </div>
        </div>
      </div>
    </StepCard>
  );
}
