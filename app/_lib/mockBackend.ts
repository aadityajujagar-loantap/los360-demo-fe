const MOCK_TOKEN = "dummy-sadmin-token";
const AUTH_USER = "SADMIN";
const AUTH_PASSWORD = "SuperAdmin@123";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type MockStore = {
  users: any[];
  roles: any[];
  permissions: any[];
  regions: any[];
  subRegions: any[];
  states: any[];
  districts: any[];
  branches: any[];
  branchRoles: any[];
  masterValues: any[];
  appStatuses: any[];
  products: any[];
  schemes: any[];
  slabs: any[];
  applications: any[];
  documents: any[];
  makerRequests: any[];
  userBranchMappings: any[];
};

const STORAGE_KEY = "los360_mock_backend_store_v2";

const now = () => new Date().toISOString();

const permissions = [
  "dashboard.view",
  "applications.view",
  "applications.update",
  "users.view",
  "users.create",
  "users.update",
  "users.delete",
  "roles.view",
  "roles.create",
  "roles.update",
  "roles.delete",
  "permissions.view",
  "maker_requests.view",
  "regions.view",
  "sub_regions.view",
  "states.view",
  "districts.view",
  "branches.view",
  "branch_roles.view",
  "master_values.view",
  "product_config.view",
  "product_config.update",
].map((name, index) => ({
  id: index + 1,
  name,
  description: `${name.replace(".", " ")} access`,
  created_at: now(),
  updated_at: now(),
  created_by: 1,
  updated_by: 1,
}));

const initialStore = (): MockStore => {
  const role = {
    id: 1,
    name: "Super Admin",
    description: "Full dummy access for hosted frontend demo",
    permissions,
    created_at: now(),
    updated_at: now(),
    created_by: 1,
    updated_by: 1,
  };

  return {
    permissions,
    roles: [role],
    users: [
      {
        id: 1,
        name: "SADMIN",
        email: "sadmin@iflow.local",
        phone: "9999999999",
        ticket_no: "SADMIN",
        branch_role_id: "1",
        branch_code: "PUNE001",
        zone_code: "WEST",
        email_verified_at: now(),
        deactivated_at: null,
        created_at: now(),
        updated_at: now(),
        roles: [{ id: 1, name: "Super Admin" }],
      },
      {
        id: 2,
        name: "Priya Sharma",
        email: "priya.sharma@iflow.local",
        phone: "9876501234",
        ticket_no: "EMP1024",
        branch_role_id: "2",
        branch_code: "MUM001",
        zone_code: "WEST",
        email_verified_at: now(),
        deactivated_at: null,
        created_at: now(),
        updated_at: now(),
        roles: [{ id: 1, name: "Super Admin" }],
      },
    ],
    regions: [
      { id: 1, region_code: "WEST", region_name: "West Region", created_at: now(), updated_at: now() },
      { id: 2, region_code: "SOUTH", region_name: "South Region", created_at: now(), updated_at: now() },
    ],
    subRegions: [
      { id: 1, region_code: "WEST", sub_region_code: "MH-PUNE", sub_region_name: "Pune", created_at: now(), updated_at: now() },
      { id: 2, region_code: "WEST", sub_region_code: "MH-MUM", sub_region_name: "Mumbai", created_at: now(), updated_at: now() },
    ],
    states: [
      { id: 1, state_code: "MH", state_name: "Maharashtra", created_at: now(), updated_at: now() },
      { id: 2, state_code: "KA", state_name: "Karnataka", created_at: now(), updated_at: now() },
    ],
    districts: [
      { id: 1, state_code: "MH", state_name: "Maharashtra", district_code: "PUNE", district_name: "Pune", created_at: now(), updated_at: now() },
      { id: 2, state_code: "MH", state_name: "Maharashtra", district_code: "MUM", district_name: "Mumbai", created_at: now(), updated_at: now() },
    ],
    branches: [
      {
        id: 1,
        branch_code: "PUNE001",
        branch_name: "Pune Main Branch",
        branch_number: "001",
        region_code: "WEST",
        region_name: "West Region",
        sub_region_code: "MH-PUNE",
        sub_region_name: "Pune",
        district_code: "PUNE",
        district_name: "Pune",
        created_at: now(),
        updated_at: now(),
      },
      {
        id: 2,
        branch_code: "MUM001",
        branch_name: "Mumbai Fort Branch",
        branch_number: "002",
        region_code: "WEST",
        region_name: "West Region",
        sub_region_code: "MH-MUM",
        sub_region_name: "Mumbai",
        district_code: "MUM",
        district_name: "Mumbai",
        created_at: now(),
        updated_at: now(),
      },
    ],
    branchRoles: [
      { id: 1, branch_role_code: "BM", branch_role_name: "Branch Manager", created_at: now(), updated_at: now() },
      { id: 2, branch_role_code: "RO", branch_role_name: "Relationship Officer", created_at: now(), updated_at: now() },
    ],
    masterValues: [
      { id: 1, call_type: "gender", meta_key: "Male", meta_value: "Male", sort_order: 1, is_active: true, created_at: now(), updated_at: now() },
      { id: 2, call_type: "gender", meta_key: "Female", meta_value: "Female", sort_order: 2, is_active: true, created_at: now(), updated_at: now() },
      { id: 3, call_type: "employment_type", meta_key: "Salaried", meta_value: "Salaried", sort_order: 1, is_active: true, created_at: now(), updated_at: now() },
      { id: 4, call_type: "employment_type", meta_key: "Self Employed", meta_value: "Self Employed", sort_order: 2, is_active: true, created_at: now(), updated_at: now() },
    ],
    appStatuses: [
      { id: 1, code: "SUBMITTED", name: "Submitted", stage: "Intake", status_code: "SUBMITTED", status_name: "Submitted", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 2, code: "IN_REVIEW", name: "In Review", stage: "Credit", status_code: "IN_REVIEW", status_name: "In Review", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 3, code: "PENDING_DOCS", name: "Pending Docs", stage: "Documents", status_code: "PENDING_DOCS", status_name: "Pending Docs", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 4, code: "UNDERWRITING", name: "Underwriting", stage: "Risk", status_code: "UNDERWRITING", status_name: "Underwriting", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 5, code: "APPROVAL_PENDING", name: "Approval Pending", stage: "Decision", status_code: "APPROVAL_PENDING", status_name: "Approval Pending", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 6, code: "APPROVED", name: "Approved", stage: "Decision", status_code: "APPROVED", status_name: "Approved", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 7, code: "SANCTIONED", name: "Sanctioned", stage: "Sanction", status_code: "SANCTIONED", status_name: "Sanctioned", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
      { id: 8, code: "REJECTED", name: "Rejected", stage: "Decision", status_code: "REJECTED", status_name: "Rejected", status_type: "application", is_active: true, created_at: now(), updated_at: now() },
    ],
    products: [
      { id: 1, name: "Personal Loan", min_age_salaried: 21, max_age_salaried: 60, min_age_self_emp: 23, max_age_self_emp: 65, status: "active", schemes_count: 2, created_at: now(), updated_at: now() },
      { id: 2, name: "Home Loan", min_age_salaried: 21, max_age_salaried: 65, min_age_self_emp: 23, max_age_self_emp: 70, status: "active", schemes_count: 1, created_at: now(), updated_at: now() },
      { id: 3, name: "Vehicle Loan", min_age_salaried: 21, max_age_salaried: 60, min_age_self_emp: 23, max_age_self_emp: 65, status: "active", schemes_count: 1, created_at: now(), updated_at: now() },
    ],
    schemes: [
      { id: 1, loan_product_id: 1, name: "Salaried Prime", status: "active", sort_order: 1, created_at: now(), updated_at: now() },
      { id: 2, loan_product_id: 1, name: "Self Employed Prime", status: "active", sort_order: 2, created_at: now(), updated_at: now() },
      { id: 3, loan_product_id: 2, name: "Home Flexi", status: "active", sort_order: 1, created_at: now(), updated_at: now() },
      { id: 4, loan_product_id: 3, name: "Vehicle Standard", status: "active", sort_order: 1, created_at: now(), updated_at: now() },
    ],
    slabs: [
      { id: 1, loan_product_id: 1, scheme_id: 1, scheme_name: "Salaried Prime", slab_label: "CIBIL 750+", max_loan_amount: "500000", max_loan_amt: "500000", cibil_band: ">= 750", cibil_from: 750, cibil_to: 900, gender: "All", roi_floating: "11.25", roi_fixed: "11.75", max_loan_period: "60", max_period: "60", ltv: "80", foir: "55" },
      { id: 2, loan_product_id: 2, scheme_id: 3, scheme_name: "Home Flexi", slab_label: "Prime Home", max_loan_amount: "7500000", max_loan_amt: "7500000", cibil_band: ">= 725", cibil_from: 725, cibil_to: 900, gender: "All", roi_floating: "8.75", roi_fixed: "9.25", max_loan_period: "240", max_period: "240", ltv: "85", foir: "60" },
    ],
    applications: [
      buildApplication("1001", "Aniket", "Mehta", "Personal Loan", "In Review", "IN_REVIEW", 450000),
      buildApplication("1002", "Rohan", "Patil", "Home Loan", "Pending Docs", "PENDING_DOCS", 4200000),
      buildApplication("1003", "Neha", "Kulkarni", "Vehicle Loan", "Approved", "APPROVED", 850000),
      buildApplication("1004", "Arjun", "Deshmukh", "Property Mortgage Loan", "Underwriting", "UNDERWRITING", 2800000),
      buildApplication("1005", "Kavya", "Iyer", "Education Loan", "Sanctioned", "SANCTIONED", 1200000),
      buildApplication("1006", "Sameer", "Khan", "Personal Loan", "Rejected", "REJECTED", 300000),
    ],
    documents: [
      { id: 1, application_id: "1001", category: "Identity & KYC", file_name: "PAN Card.pdf", file_extension: "pdf", status: "verified", uploaded_at: now(), remarks: "Dummy verified document" },
      { id: 2, application_id: "1001", category: "Income", file_name: "Salary Slip.pdf", file_extension: "pdf", status: "pending", uploaded_at: now(), remarks: "Dummy pending document" },
    ],
    makerRequests: [
      { id: 1, uuid: "MR-1001", group: "product_config", action_type: "update", model_class: "LoanProduct", record_id: 1, request_data: { name: "Personal Loan" }, original_data: {}, status: "pending", requested_by: 1, maker_name: "SADMIN", reviewed_by: null, reviewer_name: null, reviewed_at: null, rejection_reason: null, created_at: now(), updated_at: now() },
    ],
    userBranchMappings: [
      { id: 1, user_id: 1, user_name: "SADMIN", branch_code: "PUNE001", branch_name: "Pune Main Branch", created_at: now(), updated_at: now() },
    ],
  };
};

function buildApplication(id: string, first: string, last: string, product: string, status: string, statusCode: string, amount: number) {
  const isHome = product.includes("Home");
  const isVehicle = product.includes("Vehicle");
  const isEducation = product.includes("Education");
  const date = new Date(Date.now() - Number(id.slice(-1)) * 86400000).toISOString();

  return {
    id: Number(id),
    lapp_id: id,
    stage: "application_review",
    status,
    status_code: statusCode,
    current_status: status,
    current_step: "APPLICATION_REVIEW",
    applicant_type: "Individual",
    customer_category: "Individual",
    individual_non_individual: "Individual",
    prefix: first === "Neha" || first === "Kavya" ? "Ms." : "Mr.",
    first_name: first,
    middle_name: first === "Rohan" ? "Vilas" : first === "Sameer" ? "Iqbal" : "",
    last_name: last,
    mobile: `98${id.padStart(8, "0")}`,
    phone: `98${id.padStart(8, "0")}`,
    work_email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    cif_no: `CIF${id}`,
    loan_product: product,
    loan_scheme: isHome ? "Home Flexi" : isVehicle ? "Vehicle Standard" : isEducation ? "Education Premier" : "Salaried Prime",
    loan_amount_requested: String(amount),
    sanction_amount: String(Math.round(amount * 0.9)),
    eligible_roi: isHome ? "8.75" : isVehicle ? "9.90" : "11.25",
    eligible_emi: String(Math.round(amount / 48)),
    eligible_tenure: isHome ? "240" : isEducation ? "84" : "60",
    loan_period_requested: isHome ? "240" : isEducation ? "84" : "60",
    score: String(760 + Number(id.slice(-1)) * 5),
    branch: "Pune Main Branch",
    branch_name: "Pune Main Branch",
    state: "Maharashtra",
    district: "Pune",
    application_date: date,
    created_at: date,
    updated_at: now(),
    gender: first === "Neha" || first === "Kavya" ? "Female" : "Male",
    dob: "1991-05-12",
    date_of_birth: "1991-05-12",
    age: 35,
    father_name: "Demo Father",
    mother_name: "Demo Mother",
    marital_status: Number(id) % 2 ? "Married" : "Single",
    education: isEducation ? "Graduate" : "Post Graduate",
    occupation: "Salaried",
    pan: "ABCDE1234F",
    aadhaar: "XXXX-XXXX-1234",
    current_address_line1: "Flat 101, Demo Residency",
    current_address_line2: "FC Road, Shivajinagar",
    current_city: "Pune",
    current_state: "Maharashtra",
    current_pincode: "411004",
    current_residence_ownership: "Owned",
    permanent_address_line1: "Flat 101, Demo Residency",
    permanent_address_line2: "FC Road, Shivajinagar",
    permanent_city: "Pune",
    permanent_state: "Maharashtra",
    permanent_pincode: "411004",
    permanent_residence_ownership: "Owned",
    address_line_1: "Flat 101, Demo Residency",
    address_line_2: "FC Road, Shivajinagar",
    city: "Pune",
    pincode: "411004",
    employment_type: "Salaried",
    employer_name: "Demo Industries Pvt Ltd",
    monthly_income: "85000",
    annual_income: "1020000",
    bank_name: "Cosmos Bank",
    account_number: "XXXXXX1234",
    ifsc: "COSB000001",
    dedupe_status: "new_customer",
    cbs_customer_id: `CBS${id}`,
    eligible_offer: {
      eligible: true,
      sanction_amount: Math.round(amount * 0.9),
      eligible_roi: isHome ? "8.75" : isVehicle ? "9.90" : "11.25",
      eligible_emi: Math.round(amount / 48),
      eligible_tenure: isHome ? "240" : isEducation ? "84" : "60",
    },
  };
}

function getStore(): MockStore {
  if (typeof window === "undefined") return initialStore();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = initialStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return { ...initialStore(), ...JSON.parse(raw) };
  } catch {
    const seed = initialStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function saveStore(store: MockStore) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
}

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
}

function text(data: string, init?: ResponseInit) {
  return new Response(data, {
    status: init?.status ?? 200,
    headers: { "Content-Type": "text/plain", ...(init?.headers || {}) },
  });
}

function pdfBlob(fileName = "dummy-document.pdf") {
  const body = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj\n4 0 obj<</Length 54>>stream\nBT /F1 18 Tf 40 80 Td (${fileName}) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

function paginate<T>(items: T[], page = 1, perPage = 10) {
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);
  return {
    data,
    current_page: page,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
    per_page: perPage,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: start + data.length,
  };
}

function normalizeEndpoint(input: string) {
  let endpoint = input;
  try {
    endpoint = new URL(input).pathname + new URL(input).search;
  } catch {}
  endpoint = endpoint.replace(/^\/api\/?/, "/").replace(/^api\/?/, "/");
  if (!endpoint.startsWith("/")) endpoint = `/${endpoint}`;
  const [path, query = ""] = endpoint.split("?");
  return { path, query: new URLSearchParams(query) };
}

function nextId(items: any[]) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function crud(store: MockStore, key: keyof MockStore, method: Method, path: string, body: any, idField = "id") {
  const collection = store[key] as any[];
  const id = decodeURIComponent(path.split("/").pop() || "");
  if (method === "GET") {
    const item = collection.find((entry) => String(entry[idField] ?? entry.id) === id);
    return json({ status: "success", data: item ?? collection[0] ?? null });
  }
  if (method === "POST") {
    const item = { id: nextId(collection), ...body, created_at: now(), updated_at: now() };
    collection.push(item);
    saveStore(store);
    return json({ status: "success", message: "Saved in dummy mode.", data: item });
  }
  if (method === "PUT") {
    const index = collection.findIndex((entry) => String(entry[idField] ?? entry.id) === id);
    const updated = { ...(collection[index] || { id: Number(id) || nextId(collection) }), ...body, updated_at: now() };
    if (index >= 0) collection[index] = updated;
    else collection.push(updated);
    saveStore(store);
    return json({ status: "success", message: "Updated in dummy mode.", data: updated });
  }
  const index = collection.findIndex((entry) => String(entry[idField] ?? entry.id) === id);
  if (index >= 0) collection.splice(index, 1);
  saveStore(store);
  return json({ status: "success", message: "Deleted in dummy mode." });
}

function offerLetterBase64() {
  return btoa("Dummy offer letter generated by frontend mock mode.");
}

export async function handleMockRequest(endpoint: string, method: Method = "GET", body?: any): Promise<Response> {
  const store = getStore();
  const { path, query } = normalizeEndpoint(endpoint);
  const page = Number(query.get("page") || 1);
  const perPage = Number(query.get("per_page") || 10);

  if (path === "/auth/captcha") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="40"><rect width="130" height="40" rx="8" fill="#eef2ff"/><text x="20" y="26" font-family="Arial" font-size="18" font-weight="700" fill="#4f46e5">DUMMY</text></svg>`;
    return json({ status: "success", message: "Dummy captcha", respData: { captcha_key: "dummy-captcha", captcha_img: `data:image/svg+xml;base64,${btoa(svg)}` } });
  }

  if (path === "/auth/login") {
    const userName = String(body?.userName || body?.email || body?.username || "").trim();
    const password = String(body?.password || "");
    if (userName.toUpperCase() !== AUTH_USER || password !== AUTH_PASSWORD) {
      return json({ status: "error", message: "Use SADMIN / SuperAdmin@123 for dummy login." }, { status: 401 });
    }
    return json({ status: "success", message: "Dummy login successful.", token: MOCK_TOKEN, respData: { token: MOCK_TOKEN, user: store.users[0] } });
  }

  if (path === "/auth/verify-otp") {
    return json({ status: "success", token: MOCK_TOKEN, respData: { token: MOCK_TOKEN, user: store.users[0] } });
  }

  if (path === "/logout") return json({ status: "success", message: "Logged out." });
  if (path === "/user") return json({ status: "success", data: store.users[0] });
  if (path === "/user/roles-permissions") {
    return json({
      status: "success",
      respData: {
        roles: [{ ...store.roles[0], permissions }],
        permissions,
        is_super_admin: true,
      },
    });
  }

  if (path === "/admin/reports/loan-applications/export") {
    const rows = [
      "Application ID,Name,Product,Status,Amount",
      ...store.applications.map((app) => `${app.lapp_id},${app.first_name} ${app.last_name},${app.loan_product},${app.status},${app.loan_amount_requested}`),
    ];
    return text(rows.join("\n"), { headers: { "Content-Type": "text/csv" } });
  }

  if (path === "/admin/reports/loan-applications/filter-options") {
    return json({ status: "success", data: { statuses: ["Submitted", "In Review", "Pending Docs", "Underwriting", "Approval Pending", "Approved", "Sanctioned", "Rejected"], loan_products: ["Personal Loan", "Home Loan", "Vehicle Loan", "Property Mortgage Loan", "Education Loan"] } });
  }

  if (path === "/admin/reports/loan-applications") {
    let rows = store.applications;
    const status = query.get("status");
    const product = query.get("loan_product");
    if (status) rows = rows.filter((app) => String(app.status).toLowerCase() === status.toLowerCase());
    if (product) rows = rows.filter((app) => String(app.loan_product).toLowerCase() === product.toLowerCase());
    return json({ data: rows, meta: { total: rows.length, per_page: perPage, current_page: page, last_page: Math.max(1, Math.ceil(rows.length / perPage)) } });
  }

  if (path.match(/^\/admin\/applications\/[^/]+\/documents\/upload$/)) {
    const appId = path.split("/")[3];
    const doc = {
      id: nextId(store.documents),
      application_id: appId,
      category: body?.category || body?.doc_type || "Other",
      doc_type: body?.category || body?.doc_type || "Other",
      file_name: body?.file_name || "uploaded-document.pdf",
      file_extension: String(body?.file_name || "pdf").split(".").pop()?.toLowerCase() || "pdf",
      status: "pending",
      is_verified: null,
      uploaded_at: now(),
      metadata: { remarks: body?.remarks || "" },
    };
    store.documents.push(doc);
    saveStore(store);
    return json({ status: "success", message: "Document uploaded in dummy mode.", data: doc });
  }

  if (path.match(/^\/admin\/applications\/[^/]+\/documents\/[^/]+\/download$/)) {
    return pdfBlob("dummy-document.pdf");
  }

  if (path.match(/^\/admin\/applications\/[^/]+\/documents\/[^/]+\/verify$/)) {
    return json({ status: "success", message: "Document updated in dummy mode." });
  }

  if (path.match(/^\/admin\/applications\/[^/]+\/documents$/)) {
    const appId = path.split("/")[3];
    const docs = store.documents.filter((doc) => String(doc.application_id) === String(appId));
    const fallbackDocs = store.documents
      .filter((doc) => doc.application_id === "1001")
      .map((doc, index) => ({
        ...doc,
        id: Number(`${appId}${index + 1}`),
        application_id: appId,
      }));
    return json({ status: "success", data: docs.length ? docs : fallbackDocs });
  }

  if (path.match(/^\/admin\/applications\/[^/]+$/)) {
    const id = path.split("/").pop();
    const app = store.applications.find((entry) => String(entry.lapp_id) === String(id)) || store.applications[0];
    if (app && (app.first_name === "Ananya" || app.first_name === "Aniket")) {
      app.first_name = "Aniket";
      app.prefix = "Mr.";
      app.gender = "Male";
    }
    return json({
      status: "success",
      data: {
        application: app,
        coapplicants: [],
      },
    });
  }

  if (path === "/admin/users") return method === "GET" ? json({ status: "success", data: paginate(store.users, page, perPage) }) : crud(store, "users", method, path, body);
  if (path.match(/^\/admin\/users\/\d+\/(deactivate|reactivate)$/)) return json({ status: "success", message: "User status changed in dummy mode." });
  if (path.match(/^\/admin\/users\/\d+\/roles(\/\d+)?$/)) return method === "GET" ? json(store.roles) : json(store.users[0]);
  if (path.match(/^\/admin\/users\/\d+$/)) return crud(store, "users", method, path, body);

  if (path === "/admin/permissions") return method === "GET" ? json(store.permissions) : crud(store, "permissions", method, path, body);
  if (path.match(/^\/admin\/permissions\/\d+$/)) return crud(store, "permissions", method, path, body);
  if (path === "/admin/roles") return method === "GET" ? json(store.roles) : crud(store, "roles", method, path, { ...body, permissions: [] });
  if (path.match(/^\/admin\/roles\/\d+\/permissions(\/\d+)?$/)) return json(store.roles[0]);
  if (path.match(/^\/admin\/roles\/\d+$/)) return crud(store, "roles", method, path, body);

  if (path === "/admin/maker-requests") return json({ status: "success", data: paginate(store.makerRequests, page, perPage) });
  if (path.match(/^\/admin\/maker-requests\/[^/]+\/(approve|reject)$/)) return json({ status: "success", message: "Maker request processed in dummy mode." });
  if (path.match(/^\/admin\/maker-requests\/[^/]+$/)) return json({ status: "success", data: store.makerRequests[0] });

  if (path === "/admin/user-branch-mappings/upload-csv") {
    return json({
      status: "success",
      message: "CSV processed in dummy mode.",
      data: { inserted: 3, updated: 0, skipped: 0, errors: [] },
    });
  }

  const adminLists: Record<string, [keyof MockStore, string]> = {
    "/admin/regions": ["regions", "region_code"],
    "/admin/sub-regions": ["subRegions", "sub_region_code"],
    "/admin/master-values": ["masterValues", "id"],
    "/admin/branches": ["branches", "branch_code"],
    "/admin/states": ["states", "state_code"],
    "/admin/districts": ["districts", "district_code"],
    "/admin/branch-roles": ["branchRoles", "id"],
    "/admin/app-statuses": ["appStatuses", "status_code"],
    "/admin/user-branch-mappings": ["userBranchMappings", "id"],
  };

  for (const [base, [key, idField]] of Object.entries(adminLists)) {
    if (path === `${base}/dropdown` || path === `${base}/list`) return json({ status: "success", data: store[key] });
    if (path === base) return method === "GET" ? json({ status: "success", data: paginate(store[key] as any[], page, perPage) }) : crud(store, key, method, path, body, idField);
    if (path.startsWith(`${base}/`)) return crud(store, key, method, path, body, idField);
  }

  if (path === "/admin/loan-products" || path === "/v1/loan-products" || path === "/loan-products-list") {
    return method === "GET" ? json({ status: "success", data: store.products }) : crud(store, "products", method, path, body);
  }
  if (path.match(/^\/v1\/loan-products\/\d+$/)) return crud(store, "products", method, path, body);
  if (path.match(/^\/admin\/loan-products\/\d+$/)) return crud(store, "products", method, path, body);
  if (path.match(/^\/admin\/loan-products\/\d+\/(save-draft|submit-for-approval|archive)$/)) return json({ status: "success", message: "Product workflow saved in dummy mode." });
  if (path.match(/^\/(admin\/)?loan-products\/\d+\/schemes$/) || path.match(/^\/v1\/loan-products\/\d+\/schemes$/)) {
    const productId = Number(path.split("/").filter(Boolean).find((part) => /^\d+$/.test(part)));
    return method === "GET" ? json({ status: "success", data: store.schemes.filter((scheme) => scheme.loan_product_id === productId) }) : crud(store, "schemes", method, path, { ...body, loan_product_id: productId });
  }
  if (path.match(/^\/v1\/schemes\/\d+\/parameters$/)) return json({ status: "success", data: { processing_fee: "1.00", min_income: "25000", max_tenure: "60" } });
  if (path.match(/^\/v1\/schemes\/\d+$/)) return crud(store, "schemes", method, path, body);
  if (path.match(/^\/v1\/schemes\/\d+\/slabs$/)) {
    const schemeId = Number(path.split("/")[3]);
    if (method === "POST") return crud(store, "slabs", method, path, { ...body, scheme_id: schemeId });
    return json({ status: "success", data: store.slabs.filter((slab) => slab.scheme_id === schemeId) });
  }
  if (path.match(/^\/v1\/slabs\/\d+$/)) return crud(store, "slabs", method, path, body);
  if (path === "/v1/loan-products/slabs") return json({ status: "success", data: store.slabs });

  if (path === "/states/dropdown") return json({ data: store.states });
  if (path === "/districts/dropdown") return json({ data: store.districts });
  if (path === "/branches/dropdown") return json({ data: store.branches });
  if (path === "/master-values/dropdown") return json({ data: store.masterValues.filter((item) => !query.get("call_type") || item.call_type === query.get("call_type")) });

  if (path === "/v1/loan/process-step") {
    const applicationId = body?.application_id || body?.payload?.application_id || String(Date.now()).slice(-6);
    return json({ status: "success", message: "Dummy journey step saved.", data: { application_id: applicationId, otp_reference_id: "DUMMY-OTP", eligible: true, sanction_amount: 450000, eligible_roi: "11.25", eligible_emi: 9825, eligible_tenure: 60 } });
  }
  if (path.match(/^\/v1\/loan\/applications\/[^/]+$/)) {
    const id = path.split("/").pop();
    const app = store.applications.find((entry) => String(entry.lapp_id) === String(id)) || store.applications[0];
    return json({ status: "success", data: { application: app, eligible_offer: app.eligible_offer } });
  }
  if (path === "/v1/loan/loan-offers") return json({ status: "success", data: { offer_letter_base64: offerLetterBase64(), message: "Dummy offer letter generated." } });

  if (path.match(/^\/v1\/applications\/[^/]+\/status$/)) {
    const id = path.split("/")[3];
    const app = store.applications.find((entry) => String(entry.lapp_id) === String(id)) || store.applications[0];
    return json({
      status: "success",
      data: {
        status: app.status,
        status_code: app.status_code || "IN_REVIEW",
        status_name: app.status,
        remarks: "Dummy workflow status",
        updated_at: now(),
      },
    });
  }
  if (path.match(/^\/v1\/applications\/[^/]+\/history$/)) {
    return json({
      status: "success",
      data: [
        { id: 1, status: "Submitted", status_code: "SUBMITTED", remarks: "Dummy application submitted.", created_at: now(), created_by: "System" },
        { id: 2, status: "In Review", status_code: "IN_REVIEW", remarks: "Assigned to credit desk.", created_at: now(), created_by: "SADMIN" },
      ],
    });
  }
  if (path === "/v1/workflow/statuses") return json({ status: "success", data: store.appStatuses });
  if (path.match(/^\/v1\/applications\/[^/]+\/approval-action$/)) return json({ status: "success", message: "Decision saved in dummy mode." });
  if (path.match(/^\/v1\/applications\/[^/]+\/dedupe$/)) {
    return json({
      success: true,
      dedupe_status: "new_customer",
      cbs_customer_id: "CBS-DUMMY-1001",
      match_score: 0,
      customer_name: "Dummy Applicant",
      message: "No dummy duplicates found.",
      data: { matches: [], risk_level: "Low" },
    });
  }
  if (path.match(/^\/v1\/applications\/[^/]+\/nach\/(create|status)$/)) {
    return json({
      status: "success",
      message: "Dummy NACH mandate active.",
      data: {
        subscription_status: "ACTIVE",
        authorization_status: "SUCCESS",
        mandate_url: "https://payments.cashfree.com/subscriptions/pay/dummy-session",
        subscription_session_id: "dummy-session",
        max_amount: 500000,
        plan_amount: 9825,
      },
    });
  }
  if (path.match(/^\/v1\/bureau/)) return json({ status: "success", data: { score: 782, provider: "Equifax", accounts: [], enquiries: [], summary: { active_accounts: 3, overdue_accounts: 0 } } });
  if (path.match(/^\/cibil/)) return json({ status: "success", data: [] });

  return json({ status: "success", message: "Dummy response", data: {} });
}

export async function mockBaseQuery(args: any) {
  const url = typeof args === "string" ? args : args?.url || "/";
  const method = (typeof args === "string" ? "GET" : args?.method || "GET") as Method;
  const response = await handleMockRequest(url, method, args?.body);
  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok) {
    return { error: { status: response.status, data: contentType.includes("json") ? await response.json() : await response.text() } };
  }
  return { data: contentType.includes("text/csv") || contentType.includes("text/plain") ? await response.text() : await response.json() };
}

export function isDummyToken(token: string | null) {
  return token === MOCK_TOKEN;
}
