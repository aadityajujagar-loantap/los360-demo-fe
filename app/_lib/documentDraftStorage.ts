type DocumentDraftRecord = {
  id: string;
  draftKey: string;
  fieldKey: string;
  name: string;
  size: number;
  extension: string;
  file: File;
  docType?: string;
  docSubType?: string;
  updatedAt: number;
};

export type RestoredDocumentDraft = Omit<DocumentDraftRecord, "id" | "draftKey">;

const DB_NAME = "cosmos_los_document_drafts";
const STORE_NAME = "document_drafts";
const DB_VERSION = 1;

const canUseIndexedDb = () =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

const openDocumentDraftDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (store && !store.indexNames.contains("draftKey")) {
        store.createIndex("draftKey", "draftKey", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
) => {
  const db = await openDocumentDraftDb();

  return new Promise<T | void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);

    tx.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export const getDocumentDraftKey = (loanType: string, applicationId?: string) =>
  applicationId ? `loan-docs:${loanType}:${applicationId}` : "";

export async function saveDocumentDraft(
  draftKey: string,
  fieldKey: string,
  file: File,
  meta: { docType?: string; docSubType?: string; extension?: string } = {},
) {
  if (!draftKey) return;

  const extension = meta.extension || file.name.split(".").pop() || "";
  const record: DocumentDraftRecord = {
    id: `${draftKey}:${fieldKey}`,
    draftKey,
    fieldKey,
    name: file.name,
    size: file.size,
    extension,
    file,
    docType: meta.docType,
    docSubType: meta.docSubType,
    updatedAt: Date.now(),
  };

  await runTransaction("readwrite", (store) => store.put(record));
}

export async function deleteDocumentDraft(draftKey: string, fieldKey: string) {
  if (!draftKey) return;
  await runTransaction("readwrite", (store) => store.delete(`${draftKey}:${fieldKey}`));
}

export async function loadDocumentDrafts(draftKey: string) {
  if (!draftKey) return {};

  const records = await runTransaction<DocumentDraftRecord[]>("readonly", (store) =>
    store.index("draftKey").getAll(draftKey),
  );

  return (records || []).reduce<Record<string, RestoredDocumentDraft>>((acc, record) => {
    acc[record.fieldKey] = {
      fieldKey: record.fieldKey,
      name: record.name,
      size: record.size,
      extension: record.extension,
      file: record.file,
      docType: record.docType,
      docSubType: record.docSubType,
      updatedAt: record.updatedAt,
    };
    return acc;
  }, {});
}

export async function clearDocumentDrafts(draftKey: string) {
  if (!draftKey) return;

  const records = await runTransaction<DocumentDraftRecord[]>("readonly", (store) =>
    store.index("draftKey").getAll(draftKey),
  );

  await Promise.all(
    (records || []).map((record) =>
      runTransaction("readwrite", (store) => store.delete(record.id)),
    ),
  );
}
