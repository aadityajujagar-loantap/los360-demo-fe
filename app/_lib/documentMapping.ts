export type RestoredDocument = {
  id?: string | number;
  fieldKey: string;
  docType: string;
  docSubType: string;
  fileName: string;
  filePath: string;
  fileExtension: string;
};

const getString = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const getFirstString = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = getString(source[key]).trim();
    if (value) return value;
  }
  return "";
};

const fileNameFromPath = (path: string) => {
  const clean = path.split("?")[0].split("#")[0];
  return clean.split(/[\\/]/).pop() || "";
};

export function getDocumentFieldKey(docType: string, docSubType: string) {
  const type = docType.toUpperCase();
  const subType = docSubType.toUpperCase();

  if (subType === "IDENTITY_PROOF") return "id_proof";
  if (subType === "ADDRESS_PROOF") return "address_proof";

  if (subType === "INCOME_PROOF") {
    if (type === "BANK_STATEMENT") return "bank_stmt_combined";
    if (type === "SALARY_SLIP") return "salary_slip_combined";
    return "income_proof";
  }

  if (subType === "ASSET_PROOF") {
    const assetMap: Record<string, string> = {
      VEHICLE_QUOTATION: "vehicle_quotation",
      SALES_DEED: "sales_deed",
      TAX_RECEIPT: "tax_receipt",
      AGREEMENT_SALE: "agreement_sale",
      PROPERTY_CARD: "property_card",
    };
    return assetMap[type] || type.toLowerCase();
  }

  if (subType === "EDUCATION_PROOF") {
    const educationMap: Record<string, string> = {
      ADMISSION_LETTER: "admission_letter",
      MARKSHEETS: "marksheets",
    };
    return educationMap[type] || type.toLowerCase();
  }

  return type.toLowerCase();
}

export function normalizeBackendDocument(
  doc: Record<string, unknown>,
): RestoredDocument {
  const docType = getFirstString(doc, ["doc_type", "document_type", "type"]).toUpperCase();
  const docSubType = getFirstString(doc, [
    "doc_sub_type",
    "document_sub_type",
    "sub_type",
  ]).toUpperCase();
  const filePath = getFirstString(doc, [
    "file_path",
    "document_path",
    "doc_path",
    "storage_path",
    "path",
    "file_url",
    "url",
  ]);
  const fileName =
    getFirstString(doc, ["file_name", "original_file_name", "original_name", "name"]) ||
    fileNameFromPath(filePath) ||
    "Uploaded File";
  const fileExtension =
    getFirstString(doc, ["file_extension", "extension"]) ||
    fileName.split(".").pop() ||
    "";

  return {
    id: (doc.id as string | number | undefined) ?? (doc.document_id as string | number | undefined),
    fieldKey: getDocumentFieldKey(docType, docSubType),
    docType,
    docSubType,
    fileName,
    filePath,
    fileExtension,
  };
}
