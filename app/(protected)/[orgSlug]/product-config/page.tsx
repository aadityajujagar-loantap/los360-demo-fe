"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./product-config.module.css";
import { get, post, put, del } from "../../../_lib/redux/services/apiClient";
import { fetchUserRolesPermissions } from "../../../_lib/redux/services/adminApi";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type LoanProduct = {
  id: number;
  name: string;
  min_age_salaried: number;
  max_age_salaried: number;
  min_age_self_emp: number;
  max_age_self_emp: number;
  status: "active" | "archived";
  schemes_count?: number;
  created_at?: string;
  updated_at?: string;
};

type LoanScheme = {
  id: number;
  loan_product_id: number;
  name: string;
  status: "active" | "archived";
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

type ROISlab = {
  id: number;
  slab_num: number;
  range_type: "upto" | "above";
  amount: number | string;
  roi_percentage: number | string;
};

type LTVSlab = {
  id: number;
  slab_num: number;
  range_type: "upto" | "above";
  amount: number | string;
  min_margin_percentage: number | string;
};

type FOIRSlab = {
  id: number;
  slab_num: number;
  range_type: "upto" | "above";
  amount: number | string;
  max_foir_percentage: number | string;
};

type MasterSlabRow = {
  id: number;
  scheme_name: string;
  slab_label: string;
  max_loan_amt: string;
  cibil_band: string;
  cibil_from?: number;
  cibil_to?: number;
  gender: string;
  roi_floating: string;
  roi_fixed: string;
  max_period: string;
  ltv: string;
  foir: string;
};

type SchemeWithSlabs = {
  id: number;
  name: string;
  slabs: any[];
};

type ProductWithSchemes = {
  id: number;
  name: string;
  status: string;
  schemes: SchemeWithSlabs[];
};

type ScoreBandType = "NA" | ">" | ">=" | "<" | "<=" | "=" | "Between";

type SlabGender = "Male" | "Female" | "All" | "Transgender";

type NewSlabFormData = {
  product_id: number | null;
  scheme_id: number | null;
  slab_label: string;
  max_loan_amount: string;
  score_band_type: ScoreBandType;
  score_band_from: string;
  score_band_to: string;
  gender: SlabGender;
  max_loan_period: string;
  roi_floating: string;
  roi_fixed: string;
  ltv: string;
  foir: string;
  maker_comment: string;
  checker_comment: string;
};

type ApiMakerResponse = {
  request_id?: number | string;
  message?: string;
  status?: string;
  reference?: string;
  action_type?: string;
  group?: string;
  data?: any;
};

type ModalApiResponse = {
  status?: string;
  message?: string;
  request_id?: number | string;
  reference?: string;
  action_type?: string;
  group?: string;
  success?: boolean;
};

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const fetchLoanProducts = async (): Promise<LoanProduct[]> => {
  try {
    const res = await get("/v1/loan-products");
    if (!res.ok) {
      console.warn("Products API returned non-OK status:", res.status);
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
};

const fetchLoanSchemes = async (productId: number): Promise<LoanScheme[]> => {
  try {
    const res = await get(`/v1/loan-products/${productId}/schemes`);
    if (!res.ok) {
      console.warn("Schemes API returned non-OK status:", res.status);
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error("Failed to fetch schemes:", error);
    return [];
  }
};

const fetchSchemeParameters = async (schemeId: number) => {
  try {
    const res = await get(`/v1/schemes/${schemeId}/parameters`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (error) {
    console.error("Failed to fetch scheme parameters:", error);
    return null;
  }
};

const fetchSchemeSlabs = async (schemeId: number) => {
  try {
    const res = await get(`/v1/schemes/${schemeId}/slabs`);
    if (!res.ok) {
      console.warn("Scheme slabs API returned non-OK status:", res.status);
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error("Failed to fetch scheme slabs:", error);
    return [];
  }
};

const fetchMasterSlabs = async () => {
  try {
    const res = await get(`/v1/loan-products/slabs`);
    if (!res.ok) {
      console.warn("Slabs API returned non-OK status:", res.status);
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error("Failed to fetch slabs:", error);
    return [];
  }
};

const handleApiResponse = async (res: Response, successMsg: string) => {
  if (res.status === 202) {
    const json: ApiMakerResponse = await res.json();
    return { success: true, isMakerRequest: true, data: json };
  }
  if (!res.ok) {
    const json = await res.json();
    alert(`Error: ${json.message || "Operation failed"}`);
    return { success: false, isMakerRequest: false, data: null };
  }
  alert(successMsg);
  return { success: true, isMakerRequest: false, data: await res.json() };
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductConfigPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [authUser, setAuthUser] = useState<{ name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isCheckerOnly, setIsCheckerOnly] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [mode, setMode] = useState<"maker" | "checker">("maker");
  const [loading, setLoading] = useState(false);

  // Tab 1 - Products & Schemes
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [schemes, setSchemes] = useState<LoanScheme[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);

  // Separate state for scheme form's product selection (independent from product editing)
  const [schemeFormProductId, setSchemeFormProductId] = useState<number | null>(
    null,
  );

  const [productForm, setProductForm] = useState({
    name: "",
    min_age_salaried: 18,
    max_age_salaried: 58,
    min_age_self_emp: 18,
    max_age_self_emp: 65,
  });

  const [schemeForm, setSchemeForm] = useState({
    name: "",
  });

  // Tab 2 - Scheme Parameters
  const [minLoanAmt, setMinLoanAmt] = useState("");
  const [maxLoanAmt, setMaxLoanAmt] = useState("");
  const [minPeriod, setMinPeriod] = useState("");
  const [maxPeriod, setMaxPeriod] = useState("");
  const [roiLabel, setRoiLabel] = useState("Rate of Interest (%) p.a.");
  const [roiSlabs, setRoiSlabs] = useState<ROISlab[]>([]);
  const [ltvLabel, setLtvLabel] = useState("LTV %");
  const [ltvSlabs, setLtvSlabs] = useState<LTVSlab[]>([]);
  const [foirLabel, setFoirLabel] = useState("FOIR Income Range");
  const [foirSlabs, setFoirSlabs] = useState<FOIRSlab[]>([]);
  const [foirDeviation, setFoirDeviation] = useState("");

  // Tab 3 - Master Slabs (mock data)
  const [masterSlabs, setMasterSlabs] = useState<ProductWithSchemes[]>([]);

  // Tab 3 - Modal & Side Panel States
  const [showAddSlabModal, setShowAddSlabModal] = useState(false);
  const [showEditSlabPanel, setShowEditSlabPanel] = useState(false);
  const [editingSlabId, setEditingSlabId] = useState<number | null>(null);

  const [newSlabForm, setNewSlabForm] = useState<NewSlabFormData>({
    product_id: null,
    scheme_id: null,
    slab_label: "",
    max_loan_amount: "",
    score_band_type: "NA",
    score_band_from: "",
    score_band_to: "",
    gender: "All",
    max_loan_period: "",
    roi_floating: "",
    roi_fixed: "",
    ltv: "",
    foir: "",
    maker_comment: "",
    checker_comment: "",
  });

  // Slab modal schemes (loaded based on selected product)
  const [slabModalSchemes, setSlabModalSchemes] = useState<LoanScheme[]>([]);
  const [schemeSlabLabels, setSchemeSlabLabels] = useState<string[]>([]);

  // Edit slab form state
  const [editSlabLabel, setEditSlabLabel] = useState("");
  const [editMaxLoanAmount, setEditMaxLoanAmount] = useState("");
  const [editScoreBandType, setEditScoreBandType] =
    useState<ScoreBandType>("NA");
  const [editScoreBandFrom, setEditScoreBandFrom] = useState("");
  const [editScoreBandTo, setEditScoreBandTo] = useState("");
  const [editGender, setEditGender] = useState<SlabGender>("All");
  const [editRoiFloating, setEditRoiFloating] = useState("");
  const [editRoiFixed, setEditRoiFixed] = useState("");
  const [editMaxPeriod, setEditMaxPeriod] = useState("");
  const [editLtv, setEditLtv] = useState("");
  const [editFoir, setEditFoir] = useState("");
  const [editSchemeId, setEditSchemeId] = useState<number | null>(null);

  // Comments
  const [productMakerComment, setProductMakerComment] = useState("");
  const [productCheckerComment, setProductCheckerComment] = useState("");
  const [schemeMakerComment, setSchemeMakerComment] = useState("");
  const [schemeCheckerComment, setSchemeCheckerComment] = useState("");

  // API Response tracking
  const [lastProductApiResponse, setLastProductApiResponse] =
    useState<ApiMakerResponse | null>(null);
  const [lastSchemeApiResponse, setLastSchemeApiResponse] =
    useState<ApiMakerResponse | null>(null);
  const [schemeParamsApiResponse, setSchemeParamsApiResponse] =
    useState<ModalApiResponse | null>(null);
  const [slabApiResponse, setSlabApiResponse] =
    useState<ModalApiResponse | null>(null);

  // Scheme list filter
  const [schemeListFilterProductId, setSchemeListFilterProductId] = useState<
    number | null
  >(null);
  const [filteredSchemes, setFilteredSchemes] = useState<LoanScheme[]>([]);

  // Tab 2 - Scheme Parameters product selection
  const [tab2ProductId, setTab2ProductId] = useState<number | null>(null);
  const [tab2Schemes, setTab2Schemes] = useState<LoanScheme[]>([]);

  // Auth check
  useEffect(() => {
    (async () => {
      const res = await get("/user");
      if (res.ok) {
        setAuthUser(await res.json());
        try {
          const access = await fetchUserRolesPermissions();
          const roleNames = access.roles.map((role) => role.name.toLowerCase());
          const checkerOnly =
            !access.is_super_admin &&
            roleNames.some((name) => name.includes("checker")) &&
            !roleNames.some((name) => name.includes("maker"));
          setIsCheckerOnly(checkerOnly);
          setMode(checkerOnly ? "checker" : "maker");
        } catch {
          setIsCheckerOnly(false);
        }
      } else {
        localStorage.removeItem("auth_token");
        router.push(`/${orgSlug}/login`);
      }
      setAuthLoading(false);
    })();
  }, [router, orgSlug]);

  // Load products on mount
  useEffect(() => {
    if (!authLoading && authUser) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authUser]);

  // Load schemes when scheme form product is selected
  useEffect(() => {
    if (schemeFormProductId) {
      loadSchemes(schemeFormProductId);
    } else {
      setSchemes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeFormProductId]);

  // Clear scheme parameters data when scheme changes
  useEffect(() => {
    if (activeTab === 2) {
      // Clear all form data when scheme changes
      setMinLoanAmt("");
      setMaxLoanAmt("");
      setMinPeriod("");
      setMaxPeriod("");
      setRoiLabel("");
      setLtvLabel("");
      setFoirLabel("");
      setFoirDeviation("");
      setRoiSlabs([]);
      setLtvSlabs([]);
      setFoirSlabs([]);

      // Then load new data if a scheme is selected
      if (selectedSchemeId) {
        loadSchemeParameters(selectedSchemeId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedSchemeId]);

  // Load master slabs when Tab 3 is active
  useEffect(() => {
    if (activeTab === 3) {
      loadMasterSlabs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load filtered schemes when scheme list filter changes
  useEffect(() => {
    if (schemeListFilterProductId) {
      loadFilteredSchemes(schemeListFilterProductId);
    } else {
      setFilteredSchemes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeListFilterProductId]);

  // Load schemes for Tab 2 when product is selected
  useEffect(() => {
    if (tab2ProductId) {
      loadTab2Schemes(tab2ProductId);
    } else {
      setTab2Schemes([]);
      setSelectedSchemeId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab2ProductId]);

  // Load slab modal schemes when product changes
  useEffect(() => {
    if (newSlabForm.product_id) {
      loadSlabModalSchemes(newSlabForm.product_id);
    } else {
      setSlabModalSchemes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSlabForm.product_id]);

  // Load existing slab labels when scheme changes
  useEffect(() => {
    if (newSlabForm.scheme_id) {
      loadSchemeSlabLabels(newSlabForm.scheme_id);
    } else {
      setSchemeSlabLabels([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSlabForm.scheme_id]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchLoanProducts();
      setProducts(data);
      // Don't auto-select any product - keep form in "create" mode by default
    } catch (err) {
      console.error("Load products error:", err);
      // Don't show alert on initial load if user is not authenticated
      if (authUser) {
        alert("Failed to load products. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSchemes = async (productId: number) => {
    try {
      setLoading(true);
      const data = await fetchLoanSchemes(productId);
      setSchemes(data);
    } catch (err) {
      console.error("Load schemes error:", err);
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredSchemes = async (productId: number) => {
    try {
      const data = await fetchLoanSchemes(productId);
      setFilteredSchemes(data);
    } catch (err) {
      console.error("Load filtered schemes error:", err);
      setFilteredSchemes([]);
    }
  };

  const loadTab2Schemes = async (productId: number) => {
    try {
      const data = await fetchLoanSchemes(productId);
      setTab2Schemes(data);
    } catch (err) {
      console.error("Load Tab 2 schemes error:", err);
      setTab2Schemes([]);
    }
  };

  const loadSlabModalSchemes = async (productId: number) => {
    try {
      const data = await fetchLoanSchemes(productId);
      setSlabModalSchemes(data);
    } catch (err) {
      console.error("Load slab modal schemes error:", err);
      setSlabModalSchemes([]);
    }
  };

  const loadSchemeSlabLabels = async (schemeId: number) => {
    try {
      const slabs = await fetchSchemeSlabs(schemeId);
      // Extract unique slab labels
      const uniqueLabels = Array.from(
        new Set(slabs.map((slab: any) => slab.slab_label).filter(Boolean)),
      ) as string[];
      setSchemeSlabLabels(uniqueLabels);
    } catch (err) {
      console.error("Load scheme slab labels error:", err);
      setSchemeSlabLabels([]);
    }
  };

  const loadSlabForEdit = (slab: any) => {
    // Load the slab data into edit form state
    setEditSlabLabel(slab.slab_label || "");
    setEditMaxLoanAmount(slab.max_loan_amount || "");
    setEditGender(slab.gender || "All");
    setEditRoiFloating(
      slab.roi_floating_pct ? String(slab.roi_floating_pct) : "",
    );
    setEditRoiFixed(slab.roi_fixed_pct ? String(slab.roi_fixed_pct) : "");
    setEditMaxPeriod(
      slab.max_period_months ? String(slab.max_period_months) : "",
    );
    setEditLtv(slab.ltv_pct ? String(slab.ltv_pct) : "");
    setEditFoir(slab.foir_pct ? String(slab.foir_pct) : "");

    // Parse score band
    if (slab.score_band) {
      const operator = slab.score_band.operator;
      if (operator === "NA") {
        setEditScoreBandType("NA");
        setEditScoreBandFrom("");
        setEditScoreBandTo("");
      } else if (operator === "between") {
        setEditScoreBandType("Between");
        setEditScoreBandFrom(
          slab.score_band.value1 ? String(slab.score_band.value1) : "",
        );
        setEditScoreBandTo(
          slab.score_band.value2 ? String(slab.score_band.value2) : "",
        );
      } else if (operator === "gt") {
        setEditScoreBandType(">");
        setEditScoreBandFrom(
          slab.score_band.value1 ? String(slab.score_band.value1) : "",
        );
        setEditScoreBandTo("");
      } else if (operator === "gte") {
        setEditScoreBandType(">=");
        setEditScoreBandFrom(
          slab.score_band.value1 ? String(slab.score_band.value1) : "",
        );
        setEditScoreBandTo("");
      } else if (operator === "lt") {
        setEditScoreBandType("<");
        setEditScoreBandFrom(
          slab.score_band.value1 ? String(slab.score_band.value1) : "",
        );
        setEditScoreBandTo("");
      } else if (operator === "lte") {
        setEditScoreBandType("<=");
        setEditScoreBandFrom(
          slab.score_band.value1 ? String(slab.score_band.value1) : "",
        );
        setEditScoreBandTo("");
      } else if (operator === "eq") {
        setEditScoreBandType("=");
        setEditScoreBandFrom(
          slab.score_band.value1 ? String(slab.score_band.value1) : "",
        );
        setEditScoreBandTo("");
      }
    }
  };

  const loadSchemeParameters = async (schemeId: number) => {
    try {
      const data = await fetchSchemeParameters(schemeId);
      if (data) {
        setMinLoanAmt(String(data.min_loan_amount || "0.25"));
        setMaxLoanAmt(String(data.max_loan_amount || "300.00"));
        setMinPeriod(String(data.min_period_months || "12"));
        setMaxPeriod(String(data.max_period_months || "84"));
        setRoiLabel(data.roi_label || "Rate of Interest (%) p.a.");
        setLtvLabel(data.ltv_label || "LTV %");
        setFoirLabel(data.foir_income_range_label || "FOIR Income Range");
        setFoirDeviation(String(data.foir_deviation_pct || "75.00"));

        if (data.roi_slabs) {
          setRoiSlabs(
            data.roi_slabs.map((s: any) => ({
              id: s.id,
              slab_num: s.slab_order,
              range_type: s.range_type,
              amount: s.amount_lakhs,
              roi_percentage: s.roi_pct,
            })),
          );
        }
        if (data.ltv_slabs) {
          setLtvSlabs(
            data.ltv_slabs.map((s: any) => ({
              id: s.id,
              slab_num: s.slab_order,
              range_type: s.range_type,
              amount: s.amount_lakhs,
              min_margin_percentage: s.min_margin_pct,
            })),
          );
        }
        if (data.foir_slabs) {
          setFoirSlabs(
            data.foir_slabs.map((s: any) => ({
              id: s.id,
              slab_num: s.slab_order,
              range_type: s.range_type,
              amount: s.income_lakhs,
              max_foir_percentage: s.max_foir_pct,
            })),
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMasterSlabs = async () => {
    try {
      setLoading(true);
      const data = await fetchMasterSlabs();
      // Store the raw data for rendering (array of products with schemes and slabs)
      setMasterSlabs(data || []);
    } catch (err) {
      console.error("Load master slabs error:", err);
      setMasterSlabs([]);
    } finally {
      setLoading(false);
    }
  };

  // Helpers

  const addLTVSlab = () => {
    const newId = Math.max(...ltvSlabs.map((s) => s.id), 0) + 1;
    const newIdx = ltvSlabs.length;
    setLtvSlabs([
      ...ltvSlabs,
      {
        id: newId,
        slab_num: newIdx + 1,
        range_type: newIdx % 2 === 0 ? "upto" : "above",
        amount: "" as any,
        min_margin_percentage: "" as any,
      },
    ]);
  };

  const removeLTVSlab = (id: number) => {
    setLtvSlabs(ltvSlabs.filter((s) => s.id !== id));
  };

  const addFOIRSlab = () => {
    const newId = Math.max(...foirSlabs.map((s) => s.id), 0) + 1;
    const newIdx = foirSlabs.length;
    setFoirSlabs([
      ...foirSlabs,
      {
        id: newId,
        slab_num: newIdx + 1,
        range_type: newIdx % 2 === 0 ? "upto" : "above",
        amount: "" as any,
        max_foir_percentage: "" as any,
      },
    ]);
  };

  const removeFOIRSlab = (id: number) => {
    setFoirSlabs(foirSlabs.filter((s) => s.id !== id));
  };

  // Product CRUD handlers
  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      alert("Product name is required");
      return;
    }
    if (productForm.name.length > 300) {
      alert("Product name cannot exceed 300 characters");
      return;
    }
    if (
      productForm.min_age_salaried < 0 ||
      productForm.max_age_salaried < 0 ||
      productForm.min_age_self_emp < 0 ||
      productForm.max_age_self_emp < 0
    ) {
      alert("Age cannot be negative");
      return;
    }
    if (productMakerComment.length > 500) {
      alert("Maker comment cannot exceed 500 characters");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        name: productForm.name,
        min_age_salaried: productForm.min_age_salaried,
        max_age_salaried: productForm.max_age_salaried,
        min_age_self_emp: productForm.min_age_self_emp,
        max_age_self_emp: productForm.max_age_self_emp,
      };

      const res = selectedProductId
        ? await put(`/v1/loan-products/${selectedProductId}`, payload)
        : await post("/v1/loan-products", payload);

      const result = await handleApiResponse(
        res,
        selectedProductId
          ? "Product updated successfully"
          : "Product created successfully",
      );

      if (result.success) {
        if (result.isMakerRequest && result.data) {
          setLastProductApiResponse(result.data as ApiMakerResponse);
        } else {
          setLastProductApiResponse(null);
          await loadProducts();
        }
        // Clear form after successful submission
        setProductForm({
          name: "",
          min_age_salaried: 18,
          max_age_salaried: 58,
          min_age_self_emp: 18,
          max_age_self_emp: 65,
        });
        setSelectedProductId(null);
        setProductMakerComment("");
        setProductCheckerComment("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      setLoading(true);
      const res = await del(`/v1/loan-products/${id}`);
      const result = await handleApiResponse(
        res,
        "Product deleted successfully",
      );
      if (result.success) {
        if (result.isMakerRequest && result.data) {
          setLastProductApiResponse(result.data as ApiMakerResponse);
        } else {
          setLastProductApiResponse(null);
          await loadProducts();
          if (selectedProductId === id) setSelectedProductId(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  // Scheme CRUD handlers
  const handleSaveScheme = async () => {
    if (!schemeForm.name.trim()) {
      alert("Scheme name is required");
      return;
    }
    if (schemeForm.name.length > 300) {
      alert("Scheme name cannot exceed 300 characters");
      return;
    }
    if (!schemeFormProductId) {
      alert("Please select a product first");
      return;
    }
    if (schemeMakerComment.length > 500) {
      alert("Maker comment cannot exceed 500 characters");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        name: schemeForm.name,
      };

      const res = selectedSchemeId
        ? await put(`/v1/schemes/${selectedSchemeId}`, payload)
        : await post(
            `/v1/loan-products/${schemeFormProductId}/schemes`,
            payload,
          );

      const result = await handleApiResponse(
        res,
        selectedSchemeId
          ? "Scheme updated successfully"
          : "Scheme created successfully",
      );

      if (result.success) {
        if (result.isMakerRequest && result.data) {
          setLastSchemeApiResponse(result.data as ApiMakerResponse);
        } else {
          setLastSchemeApiResponse(null);
          await loadSchemes(schemeFormProductId);
          // Also refresh filtered schemes if same product
          if (schemeListFilterProductId === schemeFormProductId) {
            await loadFilteredSchemes(schemeFormProductId);
          }
        }
        // Clear form after successful submission
        setSchemeForm({ name: "" });
        setSelectedSchemeId(null);
        setSchemeMakerComment("");
        setSchemeCheckerComment("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save scheme");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScheme = async (schemeId: number) => {
    if (!confirm("Are you sure you want to delete this scheme?")) return;
    try {
      setLoading(true);
      const res = await del(`/v1/schemes/${schemeId}`);
      const result = await handleApiResponse(
        res,
        "Scheme deleted successfully",
      );
      if (result.success) {
        if (result.isMakerRequest && result.data) {
          setLastSchemeApiResponse(result.data as ApiMakerResponse);
        } else {
          setLastSchemeApiResponse(null);
          // Refresh filtered schemes list
          if (schemeListFilterProductId) {
            await loadFilteredSchemes(schemeListFilterProductId);
          }
          // Refresh form schemes if there's a selected product
          if (selectedProductId) {
            await loadSchemes(selectedProductId);
          }
          if (selectedSchemeId === schemeId) setSelectedSchemeId(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete scheme");
    } finally {
      setLoading(false);
    }
  };

  // Scheme Parameters save handler
  const handleSaveSchemeParameters = async () => {
    if (!selectedSchemeId) {
      alert("Please select a scheme first");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        min_loan_amount: parseFloat(minLoanAmt),
        max_loan_amount: parseFloat(maxLoanAmt),
        min_period_months: parseInt(minPeriod),
        max_period_months: parseInt(maxPeriod),
        roi_label: roiLabel,
        ltv_label: ltvLabel,
        foir_income_range_label: foirLabel,
        foir_deviation_pct: parseFloat(foirDeviation),
        roi_slabs: roiSlabs.map((s) => ({
          slab_order: s.slab_num,
          range_type: s.range_type,
          amount_lakhs: s.amount,
          roi_pct: s.roi_percentage,
        })),
        ltv_slabs: ltvSlabs.map((s) => ({
          slab_order: s.slab_num,
          range_type: s.range_type,
          amount_lakhs: s.amount,
          min_margin_pct: s.min_margin_percentage,
        })),
        foir_slabs: foirSlabs.map((s) => ({
          slab_order: s.slab_num,
          range_type: s.range_type,
          income_lakhs: s.amount,
          max_foir_pct: s.max_foir_percentage,
        })),
      };

      const res = await put(
        `/v1/schemes/${selectedSchemeId}/parameters`,
        payload,
      );

      // Show API response in modal
      const responseData = await res.json().catch(() => null);
      if (res.status === 202) {
        setSchemeParamsApiResponse({
          request_id: responseData?.reference || "",
          message:
            responseData?.message ||
            "Scheme parameters update pending approval",
          status: "pending",
        });
      } else if (res.ok) {
        setSchemeParamsApiResponse({
          message: "Scheme parameters saved successfully",
          status: "success",
        });
      } else {
        setSchemeParamsApiResponse({
          message: responseData?.message || "Failed to save scheme parameters",
          status: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setSchemeParamsApiResponse({
        message: "Failed to save scheme parameters",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Slab handlers
  const handleSaveNewSlab = async () => {
    if (!newSlabForm.scheme_id) {
      alert("Please select a scheme");
      return;
    }
    if (!newSlabForm.slab_label.trim()) {
      alert("Slab Label is required");
      return;
    }
    try {
      setLoading(true);

      const scoreBand: any = {
        operator:
          newSlabForm.score_band_type === "NA"
            ? "NA"
            : newSlabForm.score_band_type === ">"
              ? "gt"
              : newSlabForm.score_band_type === ">="
                ? "gte"
                : newSlabForm.score_band_type === "<"
                  ? "lt"
                  : newSlabForm.score_band_type === "<="
                    ? "lte"
                    : newSlabForm.score_band_type === "="
                      ? "eq"
                      : "between",
        value1: newSlabForm.score_band_from
          ? parseInt(newSlabForm.score_band_from)
          : null,
        value2:
          newSlabForm.score_band_type === "Between"
            ? newSlabForm.score_band_to
              ? parseInt(newSlabForm.score_band_to)
              : null
            : null,
        label:
          newSlabForm.score_band_type === "NA"
            ? "NA"
            : newSlabForm.score_band_type === "Between"
              ? `${newSlabForm.score_band_from} – ${newSlabForm.score_band_to}`
              : `${newSlabForm.score_band_type} ${newSlabForm.score_band_from}`,
      };

      const payload = {
        slab_label: newSlabForm.slab_label,
        max_loan_amount: newSlabForm.max_loan_amount,
        max_loan_amount_val:
          parseFloat(newSlabForm.max_loan_amount.replace(/[^0-9.]/g, "")) || 0,
        score_band: scoreBand,
        gender: newSlabForm.gender,
        roi_floating_pct: newSlabForm.roi_floating
          ? parseFloat(newSlabForm.roi_floating)
          : null,
        roi_fixed_pct: newSlabForm.roi_fixed
          ? parseFloat(newSlabForm.roi_fixed)
          : null,
        max_period_months: newSlabForm.max_loan_period
          ? parseInt(newSlabForm.max_loan_period)
          : null,
        ltv_pct: newSlabForm.ltv ? parseFloat(newSlabForm.ltv) : null,
        foir_pct: newSlabForm.foir ? parseFloat(newSlabForm.foir) : null,
      };

      const res = await post(
        `/v1/schemes/${newSlabForm.scheme_id}/slabs`,
        payload,
      );

      // Close the add slab modal first
      setShowAddSlabModal(false);

      // Parse response and show in modal
      const responseData = await res.json().catch(() => null);
      if (res.status === 202) {
        setSlabApiResponse({
          request_id: responseData?.reference || "",
          message: responseData?.message || "Slab entry submitted for approval",
          status: "pending",
        });
      } else if (res.ok) {
        setSlabApiResponse({
          message: "Slab entry created successfully",
          status: "success",
        });
        // Reload master slabs if on Tab 3
        if (activeTab === 3) {
          await loadMasterSlabs();
        }
      } else {
        setSlabApiResponse({
          message: responseData?.message || "Failed to save slab entry",
          status: "error",
        });
      }

      // Reset form
      setNewSlabForm({
        product_id: null,
        scheme_id: null,
        slab_label: "",
        max_loan_amount: "",
        score_band_type: "NA",
        score_band_from: "",
        score_band_to: "",
        gender: "All",
        max_loan_period: "",
        roi_floating: "",
        roi_fixed: "",
        ltv: "",
        foir: "",
        maker_comment: "",
        checker_comment: "",
      });
      setSlabModalSchemes([]);
      setSchemeSlabLabels([]);
    } catch (err) {
      console.error(err);
      setShowAddSlabModal(false);
      setSlabApiResponse({
        message: "Failed to save slab entry",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlab = async () => {
    if (!editingSlabId || !editSchemeId) {
      alert("Missing slab or scheme information");
      return;
    }
    if (!editSlabLabel.trim()) {
      alert("Slab Label is required");
      return;
    }
    if (!/^[a-zA-Z0-9\s.-]+$/.test(editSlabLabel)) {
      alert(
        "Slab Label should only contain letters, numbers, spaces, or dots.",
      );
      return;
    }
    try {
      setLoading(true);

      const scoreBand: any = {
        operator:
          editScoreBandType === "NA"
            ? "NA"
            : editScoreBandType === ">"
              ? "gt"
              : editScoreBandType === ">="
                ? "gte"
                : editScoreBandType === "<"
                  ? "lt"
                  : editScoreBandType === "<="
                    ? "lte"
                    : editScoreBandType === "="
                      ? "eq"
                      : "between",
        value1: editScoreBandFrom ? parseInt(editScoreBandFrom) : null,
        value2:
          editScoreBandType === "Between"
            ? editScoreBandTo
              ? parseInt(editScoreBandTo)
              : null
            : null,
        label:
          editScoreBandType === "NA"
            ? "NA"
            : editScoreBandType === "Between"
              ? `${editScoreBandFrom} – ${editScoreBandTo}`
              : `${editScoreBandType} ${editScoreBandFrom}`,
      };

      const payload = {
        slab_label: editSlabLabel,
        max_loan_amount: editMaxLoanAmount,
        max_loan_amount_val:
          parseFloat(editMaxLoanAmount.replace(/[^0-9.]/g, "")) || 0,
        score_band: scoreBand,
        gender: editGender,
        roi_floating_pct: editRoiFloating ? parseFloat(editRoiFloating) : null,
        roi_fixed_pct: editRoiFixed ? parseFloat(editRoiFixed) : null,
        max_period_months: editMaxPeriod ? parseInt(editMaxPeriod) : null,
        ltv_pct: editLtv ? parseFloat(editLtv) : null,
        foir_pct: editFoir ? parseFloat(editFoir) : null,
      };

      const res = await put(`/v1/slabs/${editingSlabId}`, payload);

      // Close the edit panel first
      setShowEditSlabPanel(false);

      // Parse response and show in modal
      const responseData = await res.json().catch(() => null);
      if (res.status === 202) {
        setSlabApiResponse({
          request_id: responseData?.reference || "",
          message:
            responseData?.message || "Slab entry update submitted for approval",
          status: "pending",
        });
      } else if (res.ok) {
        setSlabApiResponse({
          message: "Slab entry updated successfully",
          status: "success",
        });
        // Reload master slabs if on Tab 3
        if (activeTab === 3) {
          await loadMasterSlabs();
        }
      } else {
        setSlabApiResponse({
          message: responseData?.message || "Failed to update slab entry",
          status: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setShowEditSlabPanel(false);
      setSlabApiResponse({
        message: "Failed to update slab entry",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlab = async (
    slabId: number,
    schemeName: string,
    slabLabel: string,
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete this slab?\n\nScheme: ${schemeName}\nSlab: ${slabLabel}`,
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      const res = await del(`/v1/slabs/${slabId}`);

      // Parse response and show in modal
      const responseData = await res.json().catch(() => null);
      if (res.status === 202) {
        setSlabApiResponse({
          request_id: responseData?.reference || "",
          message:
            responseData?.message || "Slab deletion submitted for approval",
          status: "pending",
        });
      } else if (res.ok) {
        setSlabApiResponse({
          message: "Slab entry deleted successfully",
          status: "success",
        });
        // Reload master slabs if on Tab 3
        if (activeTab === 3) {
          await loadMasterSlabs();
        }
      } else {
        setSlabApiResponse({
          message: responseData?.message || "Failed to delete slab entry",
          status: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setSlabApiResponse({
        message: "Failed to delete slab entry",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (isCheckerOnly) {
    return (
      <>
        <div className={styles.portalHeader}>
          <div>
            <h5 className={styles.portalHeaderTitle}>
              <i className="bi bi-bank me-2"></i>Product Admin Portal
            </h5>
            <span className={styles.portalHeaderSubtitle}>
              Checker Review Access
            </span>
          </div>
        </div>
        <div className={styles.containerFluid}>
          <div className={styles.configCard} style={{ maxWidth: "720px", margin: "2rem auto" }}>
            <div className={styles.cardBody}>
              <h3 style={{ marginBottom: "0.75rem" }}>Configuration is read-only for checker users</h3>
              <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
                Add and edit actions are created by maker users. Review pending configuration changes from the Maker Requests queue.
              </p>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => router.push(`/${orgSlug}/maker-requests`)}
              >
                Open Maker Requests
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ═══════════════ TOP HEADER ═══════════════ */}
      <div className={styles.portalHeader}>
        <div>
          <h5 className={styles.portalHeaderTitle}>
            <i className="bi bi-bank me-2"></i>Product Admin Portal
          </h5>
          <span className={styles.portalHeaderSubtitle}>
            Loan Product Configuration &amp; Scheme Management
          </span>
        </div>
      </div>

      {/* ═══════════════ STEP NAV ═══════════════ */}
      <nav className={styles.stepNav}>
        <ul className={styles.navTabs}>
          <li className={styles.navItem}>
            <button
              className={`${styles.navLink} ${activeTab === 1 ? styles.navLinkActive : ""}`}
              onClick={() => setActiveTab(1)}
            >
              <span className={styles.stepNum}>1</span>Product Type
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navLink} ${activeTab === 2 ? styles.navLinkActive : ""}`}
              onClick={() => setActiveTab(2)}
            >
              <span className={styles.stepNum}>2</span>Scheme Parameters
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navLink} ${activeTab === 3 ? styles.navLinkActive : ""}`}
              onClick={() => setActiveTab(3)}
            >
              <span className={styles.stepNum}>3</span>Slab Configuration
            </button>
          </li>
        </ul>
      </nav>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <div className={styles.containerFluid}>
        {/* ══════ TAB 1 – PRODUCT TYPE ══════ */}
        {activeTab === 1 && (
          <div className={styles.rowG3}>
            {/* Left: Product Details */}
            <div className={styles.colLg7}>
              <div className={styles.configCard}>
                <div className={styles.cardHeader}>
                  <span>
                    <i className="bi bi-box-seam me-2"></i>Loan Product Details
                    <span className={styles.badgeSub}>Section 1</span>
                  </span>
                  <button
                    className={styles.btnAddNew}
                    onClick={() => {
                      setProductForm({
                        name: "",
                        min_age_salaried: 18,
                        max_age_salaried: 58,
                        min_age_self_emp: 18,
                        max_age_self_emp: 65,
                      });
                      setSelectedProductId(null);
                      setProductMakerComment("");
                      setProductCheckerComment("");
                      setLastProductApiResponse(null);
                    }}
                  >
                    <i className="bi bi-plus-circle me-1"></i>Add New Product
                  </button>
                </div>
                <div className={styles.cardBody}>
                  {/* Product form */}
                  <div className={styles.addProductForm}>
                    <div className={styles.addFormTitle}>
                      <i className="bi bi-pencil-square me-1"></i>
                      <span>{productForm.name || "New Product"}</span>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Product Name{" "}
                        <span className={styles.textDanger}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.formControl}
                        value={productForm.name}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g. Home Loan, Personal Loan…"
                        maxLength={300}
                      />
                    </div>

                    <div className={styles.rowG2}>
                      <div className={styles.col6}>
                        <label className={styles.formLabel}>
                          Min Age – Salaried (Yrs.)
                        </label>
                        <input
                          type="number"
                          className={styles.formControl}
                          value={productForm.min_age_salaried}
                          min="0"
                          onKeyDown={(e) =>
                            (e.key === "-" || e.key === "e") &&
                            e.preventDefault()
                          }
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              min_age_salaried: Math.max(
                                0,
                                Number(e.target.value),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className={styles.col6}>
                        <label className={styles.formLabel}>
                          Max Age – Salaried (Yrs.)
                        </label>
                        <input
                          type="number"
                          className={styles.formControl}
                          value={productForm.max_age_salaried}
                          min="0"
                          onKeyDown={(e) =>
                            (e.key === "-" || e.key === "e") &&
                            e.preventDefault()
                          }
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              max_age_salaried: Math.max(
                                0,
                                Number(e.target.value),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className={styles.col6}>
                        <label className={styles.formLabel}>
                          Min Age – Self Employed (Yrs.)
                        </label>
                        <input
                          type="number"
                          className={styles.formControl}
                          value={productForm.min_age_self_emp}
                          min="0"
                          onKeyDown={(e) =>
                            (e.key === "-" || e.key === "e") &&
                            e.preventDefault()
                          }
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              min_age_self_emp: Math.max(
                                0,
                                Number(e.target.value),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className={styles.col6}>
                        <label className={styles.formLabel}>
                          Max Age – Self Employed (Yrs.)
                        </label>
                        <input
                          type="number"
                          className={styles.formControl}
                          value={productForm.max_age_self_emp}
                          min="0"
                          onKeyDown={(e) =>
                            (e.key === "-" || e.key === "e") &&
                            e.preventDefault()
                          }
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              max_age_self_emp: Math.max(
                                0,
                                Number(e.target.value),
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Maker/Checker Comments - Moved below product form */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      padding: "1rem",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                    }}
                  >
                    <div className={styles.commentSection}>
                      <label className={styles.commentLabel}>
                        <i className="bi bi-pencil me-1 text-accent"></i>Maker
                        Comment
                        <small className="text-muted ms-1">
                          (max 500 chars)
                        </small>
                      </label>
                      <textarea
                        className={styles.formTextarea}
                        rows={3}
                        maxLength={500}
                        value={productMakerComment}
                        onChange={(e) => setProductMakerComment(e.target.value)}
                        placeholder="Enter maker comment…"
                      />
                      <div className={styles.charCount}>
                        {productMakerComment.length} / 500
                      </div>
                    </div>
                    {selectedProductId && mode === "checker" && (
                      <div className={styles.commentSection}>
                        <label className={styles.commentLabel}>
                          <i className="bi bi-check2-square me-1 text-success"></i>
                          Checker Comment
                          <small className="text-muted ms-1">
                            (max 500 chars)
                          </small>
                        </label>
                        <textarea
                          className={styles.formTextarea}
                          rows={3}
                          maxLength={500}
                          value={productCheckerComment}
                          onChange={(e) =>
                            setProductCheckerComment(e.target.value)
                          }
                          placeholder="Enter checker comment…"
                        />
                        <div className={styles.charCount}>
                          {productCheckerComment.length} / 500
                        </div>
                      </div>
                    )}
                    <div className={styles.commentSubmit}>
                      <button
                        className={styles.btnSuccess}
                        onClick={handleSaveProduct}
                        disabled={loading}
                      >
                        <i className="bi bi-send-check me-2"></i>
                        {loading
                          ? "Saving..."
                          : selectedProductId
                            ? "Update Product"
                            : "Save Product"}
                      </button>
                    </div>

                    {/* API Response Display */}
                    {lastProductApiResponse && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1rem",
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: "6px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "600",
                            marginBottom: "0.5rem",
                            color: "#856404",
                          }}
                        >
                          <i className="bi bi-hourglass-split me-2"></i>
                          {lastProductApiResponse.message}
                        </div>
                        <table style={{ width: "100%", fontSize: "0.875rem" }}>
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                  width: "30%",
                                }}
                              >
                                Reference:
                              </td>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontFamily: "monospace",
                                }}
                              >
                                {lastProductApiResponse.reference}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                }}
                              >
                                Status:
                              </td>
                              <td style={{ padding: "0.25rem 0" }}>
                                {lastProductApiResponse.status}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                }}
                              >
                                Action Type:
                              </td>
                              <td style={{ padding: "0.25rem 0" }}>
                                {lastProductApiResponse.action_type}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                }}
                              >
                                Group:
                              </td>
                              <td style={{ padding: "0.25rem 0" }}>
                                {lastProductApiResponse.group}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Product List */}
            <div className={styles.colLg5}>
              <div className={styles.configCard}>
                <div className={styles.cardHeader}>
                  <i className="bi bi-table me-2"></i>Product List
                </div>
                <div className={styles.cardBody}>
                  {products.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6c757d",
                      }}
                    >
                      <i className="bi bi-inbox me-2"></i>
                      No products configured yet
                    </div>
                  ) : (
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderBottom: "2px solid #dee2e6",
                          }}
                        >
                          <th
                            style={{
                              padding: "0.65rem",
                              textAlign: "left",
                              fontWeight: "600",
                              width: "20%",
                              fontSize: "0.8rem",
                            }}
                          >
                            ID
                          </th>
                          <th
                            style={{
                              padding: "0.65rem",
                              textAlign: "left",
                              fontWeight: "600",
                              width: "50%",
                              fontSize: "0.8rem",
                            }}
                          >
                            Product Name
                          </th>
                          <th
                            style={{
                              padding: "0.65rem",
                              textAlign: "center",
                              fontWeight: "600",
                              width: "30%",
                              fontSize: "0.8rem",
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr
                            key={p.id}
                            style={{ borderBottom: "1px solid #dee2e6" }}
                          >
                            <td
                              style={{
                                padding: "0.65rem",
                                fontWeight: "500",
                                fontSize: "0.85rem",
                              }}
                            >
                              #{p.id}
                            </td>
                            <td
                              style={{
                                padding: "0.65rem",
                                fontSize: "0.85rem",
                              }}
                            >
                              {p.name}
                            </td>
                            <td style={{ padding: "0.65rem" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <button
                                  className={styles.btnIconEdit}
                                  title="Edit"
                                  onClick={() => {
                                    setSelectedProductId(p.id);
                                    setProductForm({
                                      name: p.name,
                                      min_age_salaried: p.min_age_salaried,
                                      max_age_salaried: p.max_age_salaried,
                                      min_age_self_emp: p.min_age_self_emp,
                                      max_age_self_emp: p.max_age_self_emp,
                                    });
                                    setLastProductApiResponse(null);
                                  }}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className={styles.btnIconDelete}
                                  title="Delete"
                                  onClick={() => handleDeleteProduct(p.id)}
                                >
                                  <i className="bi bi-trash3"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Schemes Section */}
            <div className={styles.colLg7}>
              <div className={styles.configCard}>
                <div className={styles.cardHeader}>
                  <span>
                    <i className="bi bi-diagram-3 me-2"></i>Schemes under this
                    Product
                    <span className={styles.badgeSub}>Section 2</span>
                  </span>
                  <button
                    className={styles.btnAddNewPrimary}
                    onClick={() => {
                      setSchemeForm({ name: "" });
                      setSelectedSchemeId(null);
                      setSchemeMakerComment("");
                      setSchemeCheckerComment("");
                      setLastSchemeApiResponse(null);
                    }}
                  >
                    <i className="bi bi-plus-circle me-1"></i>Add New Scheme
                  </button>
                </div>
                <div className={styles.cardBody}>
                  {/* Scheme form */}
                  <div className={styles.addProductForm}>
                    <div className={styles.addFormTitle}>
                      <i className="bi bi-pencil-square me-1"></i>
                      <span>{schemeForm.name || "New Scheme"}</span>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Select Product{" "}
                        <span className={styles.textDanger}>*</span>
                      </label>
                      <select
                        className={styles.formControl}
                        value={schemeFormProductId || ""}
                        onChange={(e) => {
                          const productId = e.target.value
                            ? Number(e.target.value)
                            : null;
                          setSchemeFormProductId(productId);
                        }}
                      >
                        <option value="">-- Select a Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Scheme Name <span className={styles.textDanger}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.formControl}
                        value={schemeForm.name}
                        onChange={(e) =>
                          setSchemeForm({ ...schemeForm, name: e.target.value })
                        }
                        placeholder={
                          schemeFormProductId
                            ? "Enter scheme name…"
                            : "Please select a product first"
                        }
                        disabled={!schemeFormProductId}
                        maxLength={300}
                      />
                    </div>
                  </div>

                  {/* Maker/Checker Comments - Moved below scheme form */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      padding: "1rem",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                    }}
                  >
                    <div className={styles.commentSection}>
                      <label className={styles.commentLabel}>
                        <i className="bi bi-pencil me-1 text-accent"></i>Maker
                        Comment
                        <small className="text-muted ms-1">
                          (max 500 chars)
                        </small>
                      </label>
                      <textarea
                        className={styles.formTextarea}
                        rows={3}
                        maxLength={500}
                        value={schemeMakerComment}
                        onChange={(e) => setSchemeMakerComment(e.target.value)}
                        placeholder={
                          schemeFormProductId
                            ? "Enter maker comment…"
                            : "Please select a product first"
                        }
                        disabled={!schemeFormProductId}
                      />
                      <div className={styles.charCount}>
                        {schemeMakerComment.length} / 500
                      </div>
                    </div>
                    {selectedSchemeId && mode === "checker" && (
                      <div className={styles.commentSection}>
                        <label className={styles.commentLabel}>
                          <i className="bi bi-check2-square me-1 text-success"></i>
                          Checker Comment
                          <small className="text-muted ms-1">
                            (max 500 chars)
                          </small>
                        </label>
                        <textarea
                          className={styles.formTextarea}
                          rows={3}
                          maxLength={500}
                          value={schemeCheckerComment}
                          onChange={(e) =>
                            setSchemeCheckerComment(e.target.value)
                          }
                          placeholder="Enter checker comment…"
                        />
                        <div className={styles.charCount}>
                          {schemeCheckerComment.length} / 500
                        </div>
                      </div>
                    )}
                    <div className={styles.commentSubmit}>
                      <button
                        className={styles.btnSuccess}
                        onClick={handleSaveScheme}
                        disabled={loading || !schemeFormProductId}
                        title={
                          !schemeFormProductId
                            ? "Please select a product first"
                            : ""
                        }
                      >
                        <i className="bi bi-send-check me-2"></i>
                        {loading
                          ? "Saving..."
                          : selectedSchemeId
                            ? "Update Scheme"
                            : "Save Scheme"}
                      </button>
                    </div>

                    {/* API Response Display */}
                    {lastSchemeApiResponse && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1rem",
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: "6px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "600",
                            marginBottom: "0.5rem",
                            color: "#856404",
                          }}
                        >
                          <i className="bi bi-hourglass-split me-2"></i>
                          {lastSchemeApiResponse.message}
                        </div>
                        <table style={{ width: "100%", fontSize: "0.875rem" }}>
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                  width: "30%",
                                }}
                              >
                                Reference:
                              </td>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontFamily: "monospace",
                                }}
                              >
                                {lastSchemeApiResponse.reference}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                }}
                              >
                                Status:
                              </td>
                              <td style={{ padding: "0.25rem 0" }}>
                                {lastSchemeApiResponse.status}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                }}
                              >
                                Action Type:
                              </td>
                              <td style={{ padding: "0.25rem 0" }}>
                                {lastSchemeApiResponse.action_type}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: "0.25rem 0",
                                  fontWeight: "500",
                                }}
                              >
                                Group:
                              </td>
                              <td style={{ padding: "0.25rem 0" }}>
                                {lastSchemeApiResponse.group}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scheme List */}
            <div className={styles.colLg5}>
              <div className={styles.configCard}>
                <div className={styles.cardHeader}>
                  <i className="bi bi-table me-2"></i>Scheme List
                  {schemeListFilterProductId && (
                    <small
                      className="text-muted ms-2"
                      style={{ fontSize: "0.875rem", fontWeight: "400" }}
                    >
                      (
                      {
                        products.find((p) => p.id === schemeListFilterProductId)
                          ?.name
                      }
                      )
                    </small>
                  )}
                </div>
                <div className={styles.cardBody}>
                  {/* Product Filter */}
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "500",
                        fontSize: "0.875rem",
                      }}
                    >
                      <i className="bi bi-funnel me-2"></i>Filter by Product
                    </label>
                    <select
                      className={styles.formControl}
                      value={schemeListFilterProductId || ""}
                      onChange={(e) => {
                        const productId = e.target.value
                          ? Number(e.target.value)
                          : null;
                        setSchemeListFilterProductId(productId);
                      }}
                      style={{ width: "100%" }}
                    >
                      <option value="">-- Select a Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!schemeListFilterProductId ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6c757d",
                      }}
                    >
                      <i className="bi bi-info-circle me-2"></i>
                      Please select a product from the filter above
                    </div>
                  ) : filteredSchemes.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6c757d",
                      }}
                    >
                      <i className="bi bi-inbox me-2"></i>
                      No schemes configured yet
                    </div>
                  ) : (
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderBottom: "2px solid #dee2e6",
                          }}
                        >
                          <th
                            style={{
                              padding: "0.65rem",
                              textAlign: "left",
                              fontWeight: "600",
                              width: "20%",
                              fontSize: "0.8rem",
                            }}
                          >
                            ID
                          </th>
                          <th
                            style={{
                              padding: "0.65rem",
                              textAlign: "left",
                              fontWeight: "600",
                              width: "50%",
                              fontSize: "0.8rem",
                            }}
                          >
                            Scheme Name
                          </th>
                          <th
                            style={{
                              padding: "0.65rem",
                              textAlign: "center",
                              fontWeight: "600",
                              width: "30%",
                              fontSize: "0.8rem",
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchemes.map((s) => (
                          <tr
                            key={s.id}
                            style={{ borderBottom: "1px solid #dee2e6" }}
                          >
                            <td
                              style={{
                                padding: "0.65rem",
                                fontWeight: "500",
                                fontSize: "0.85rem",
                              }}
                            >
                              #{s.id}
                            </td>
                            <td
                              style={{
                                padding: "0.65rem",
                                fontSize: "0.85rem",
                              }}
                            >
                              {s.name}
                            </td>
                            <td style={{ padding: "0.65rem" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <button
                                  className={styles.btnIconEdit}
                                  title="Edit"
                                  onClick={() => {
                                    // Set the product in scheme form section
                                    setSchemeFormProductId(
                                      schemeListFilterProductId,
                                    );
                                    // Set the scheme to edit
                                    setSelectedSchemeId(s.id);
                                    setSchemeForm({
                                      name: s.name,
                                    });
                                    setLastSchemeApiResponse(null);
                                  }}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className={styles.btnIconDelete}
                                  title="Delete"
                                  onClick={() => handleDeleteScheme(s.id)}
                                >
                                  <i className="bi bi-trash3"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ TAB 2 – SCHEME PARAMETERS ══════ */}
        {activeTab === 2 && (
          <>
            {/* Product & Scheme Selector */}
            <div className={styles.schemeSelector}>
              <div
                className={styles.schemeSelectorLeft}
                style={{ flex: 1, marginRight: "1rem" }}
              >
                <label className={styles.schemeSelectorLabel}>
                  <i className="bi bi-box me-2 text-accent"></i>Select Product:
                </label>
                <select
                  className={styles.formSelect}
                  value={tab2ProductId || ""}
                  onChange={(e) => {
                    const productId = e.target.value
                      ? Number(e.target.value)
                      : null;
                    setTab2ProductId(productId);
                  }}
                >
                  <option value="">-- Select a Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.schemeSelectorLeft} style={{ flex: 1 }}>
                <label className={styles.schemeSelectorLabel}>
                  <i className="bi bi-funnel me-2 text-accent"></i>Select
                  Scheme:
                </label>
                <select
                  className={styles.formSelect}
                  value={selectedSchemeId || ""}
                  onChange={(e) => setSelectedSchemeId(Number(e.target.value))}
                  disabled={!tab2ProductId}
                >
                  <option value="">-- Select a Scheme --</option>
                  {tab2Schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!tab2ProductId ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "3rem",
                    color: "#dee2e6",
                    marginBottom: "1rem",
                  }}
                >
                  <i className="bi bi-box"></i>
                </div>
                <h3 style={{ color: "#6c757d", marginBottom: "0.5rem" }}>
                  Select a Product
                </h3>
                <p style={{ color: "#adb5bd" }}>
                  Please select a product from the dropdown above to view and
                  configure scheme parameters
                </p>
              </div>
            ) : !selectedSchemeId ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "3rem",
                    color: "#dee2e6",
                    marginBottom: "1rem",
                  }}
                >
                  <i className="bi bi-diagram-3"></i>
                </div>
                <h3 style={{ color: "#6c757d", marginBottom: "0.5rem" }}>
                  Select a Scheme
                </h3>
                <p style={{ color: "#adb5bd" }}>
                  Please select a scheme from the dropdown above to configure
                  its parameters
                </p>
              </div>
            ) : (
              <>
                <div className={styles.rowG3}>
                  {/* LEFT COLUMN */}
                  <div className={styles.colLg6}>
                    {/* Loan Amount */}
                    <div className={styles.configCard}>
                      <div className={styles.cardHeader}>
                        <i className="bi bi-currency-rupee me-2"></i>Loan Amount
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>
                            Min Loan Amt <span className={styles.req}>*</span>
                          </div>
                          <div className={styles.fieldControl}>
                            <div className={styles.inputGroup}>
                              <span className={styles.inputGroupText}>₹</span>
                              <input
                                type="number"
                                className={styles.formControlInput}
                                value={minLoanAmt}
                                onChange={(e) => setMinLoanAmt(e.target.value)}
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                        <div className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>
                            Max Loan Amt <span className={styles.req}>*</span>
                          </div>
                          <div className={styles.fieldControl}>
                            <div className={styles.inputGroup}>
                              <span className={styles.inputGroupText}>₹</span>
                              <input
                                type="number"
                                className={styles.formControlInput}
                                value={maxLoanAmt}
                                onChange={(e) => setMaxLoanAmt(e.target.value)}
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loan Period */}
                    <div className={styles.configCard}>
                      <div className={styles.cardHeader}>
                        <i className="bi bi-calendar3 me-2"></i>Loan Period
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>
                            Min. Period (Months){" "}
                            <span className={styles.req}>*</span>
                          </div>
                          <div className={styles.fieldControl}>
                            <input
                              type="number"
                              className={styles.formControlNarrow}
                              value={minPeriod}
                              onChange={(e) => setMinPeriod(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>
                            Max. Period (Months){" "}
                            <span className={styles.req}>*</span>
                          </div>
                          <div className={styles.fieldControl}>
                            <input
                              type="number"
                              className={styles.formControlNarrow}
                              value={maxPeriod}
                              onChange={(e) => setMaxPeriod(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className={styles.colLg6}>
                    {/* LTV */}
                    <div className={styles.configCard}>
                      <div className={styles.cardHeader}>
                        <i className="bi bi-graph-up me-2"></i>LTV (Loan to
                        Value)
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>LTV Label</div>
                          <div className={styles.fieldControl}>
                            <input
                              type="text"
                              className={styles.formControlMedium}
                              value={ltvLabel}
                              onChange={(e) => setLtvLabel(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className={styles.groupLabel}>LTV Slabs</div>
                        <table className={styles.slabTable}>
                          <thead>
                            <tr>
                              <th>Slab</th>
                              <th>Loan Amt. Range</th>
                              <th>Min. Margin (%)</th>
                              <th style={{ width: "60px" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {ltvSlabs.map((slab) => (
                              <tr key={slab.id}>
                                <td>{slab.slab_num}</td>
                                <td>
                                  <div className={styles.inputGroupSm}>
                                    <select
                                      className={styles.inputGroupText}
                                      style={{
                                        cursor: "pointer",
                                        border: "none",
                                        background: "transparent",
                                        fontWeight: 500,
                                        paddingRight: "4px",
                                      }}
                                      value={slab.range_type}
                                      onChange={(e) => {
                                        const updated = ltvSlabs.map((l) =>
                                          l.id === slab.id
                                            ? {
                                                ...l,
                                                range_type: e.target.value as
                                                  | "upto"
                                                  | "above",
                                              }
                                            : l,
                                        );
                                        setLtvSlabs(updated);
                                      }}
                                    >
                                      <option value="upto">upto ₹</option>
                                      <option value="above">above ₹</option>
                                    </select>
                                    <input
                                      type="number"
                                      className={styles.formControlInput}
                                      value={slab.amount}
                                      onChange={(e) => {
                                        const updated = ltvSlabs.map((l) =>
                                          l.id === slab.id
                                            ? {
                                                ...l,
                                                amount:
                                                  e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                              }
                                            : l,
                                        );
                                        setLtvSlabs(updated);
                                      }}
                                      step="0.01"
                                    />
                                  </div>
                                </td>
                                <td>
                                  <div className={styles.inputGroupSm}>
                                    <input
                                      type="number"
                                      className={styles.formControlInput}
                                      value={slab.min_margin_percentage}
                                      onChange={(e) => {
                                        const updated = ltvSlabs.map((l) =>
                                          l.id === slab.id
                                            ? {
                                                ...l,
                                                min_margin_percentage:
                                                  e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                              }
                                            : l,
                                        );
                                        setLtvSlabs(updated);
                                      }}
                                      step="0.01"
                                    />
                                    <span className={styles.inputGroupText}>
                                      %
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className={styles.btnDeleteRow}
                                    onClick={() => removeLTVSlab(slab.id)}
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          className={styles.addRowBtn}
                          onClick={addLTVSlab}
                        >
                          <i className="bi bi-plus-circle me-1"></i>Add Slab
                        </button>
                      </div>
                    </div>

                    {/* FOIR */}
                    <div className={styles.configCard}>
                      <div className={styles.cardHeader}>
                        <i className="bi bi-people me-2"></i>FOIR (Fixed
                        Obligation to Income Ratio)
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>
                            FOIR Income Range Label
                          </div>
                          <div className={styles.fieldControl}>
                            <input
                              type="text"
                              className={styles.formControlMedium}
                              value={foirLabel}
                              onChange={(e) => setFoirLabel(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className={styles.groupLabel}>
                          FOIR Slabs{" "}
                          <small className="fw-normal text-muted">
                            (variable income range &amp; FOIR%)
                          </small>
                        </div>
                        <table className={styles.slabTable}>
                          <thead>
                            <tr>
                              <th>Slab</th>
                              <th>Net Monthly Income Range</th>
                              <th>Max FOIR (%)</th>
                              <th style={{ width: "60px" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {foirSlabs.map((slab) => (
                              <tr key={slab.id}>
                                <td>{slab.slab_num}</td>
                                <td>
                                  <div className={styles.inputGroupSm}>
                                    <select
                                      className={styles.inputGroupText}
                                      style={{
                                        cursor: "pointer",
                                        border: "none",
                                        background: "transparent",
                                        fontWeight: 500,
                                        paddingRight: "4px",
                                      }}
                                      value={slab.range_type}
                                      onChange={(e) => {
                                        const updated = foirSlabs.map((f) =>
                                          f.id === slab.id
                                            ? {
                                                ...f,
                                                range_type: e.target.value as
                                                  | "upto"
                                                  | "above",
                                              }
                                            : f,
                                        );
                                        setFoirSlabs(updated);
                                      }}
                                    >
                                      <option value="upto">upto ₹</option>
                                      <option value="above">above ₹</option>
                                    </select>
                                    <input
                                      type="number"
                                      className={styles.formControlInput}
                                      value={slab.amount}
                                      onChange={(e) => {
                                        const updated = foirSlabs.map((f) =>
                                          f.id === slab.id
                                            ? {
                                                ...f,
                                                amount:
                                                  e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                              }
                                            : f,
                                        );
                                        setFoirSlabs(updated);
                                      }}
                                      step="0.01"
                                    />
                                  </div>
                                </td>
                                <td>
                                  <div className={styles.inputGroupSm}>
                                    <input
                                      type="number"
                                      className={styles.formControlInput}
                                      value={slab.max_foir_percentage}
                                      onChange={(e) => {
                                        const updated = foirSlabs.map((f) =>
                                          f.id === slab.id
                                            ? {
                                                ...f,
                                                max_foir_percentage:
                                                  e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                              }
                                            : f,
                                        );
                                        setFoirSlabs(updated);
                                      }}
                                      step="0.01"
                                    />
                                    <span className={styles.inputGroupText}>
                                      %
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className={styles.btnDeleteRow}
                                    onClick={() => removeFOIRSlab(slab.id)}
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          className={styles.addRowBtn}
                          onClick={addFOIRSlab}
                        >
                          <i className="bi bi-plus-circle me-1"></i>Add Slab
                        </button>

                        <div
                          className={styles.fieldRow}
                          style={{ marginTop: "1rem" }}
                        >
                          <div className={styles.fieldLabel}>
                            FOIR Deviation (%)
                          </div>
                          <div className={styles.fieldControl}>
                            <div className={styles.inputGroupNarrow}>
                              <input
                                type="number"
                                className={styles.formControlInput}
                                value={foirDeviation}
                                onChange={(e) =>
                                  setFoirDeviation(e.target.value)
                                }
                                step="0.01"
                              />
                              <span className={styles.inputGroupText}>%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "1rem", textAlign: "right" }}>
                  <button
                    className={styles.btnSuccess}
                    onClick={handleSaveSchemeParameters}
                    disabled={loading || !selectedSchemeId}
                  >
                    <i className="bi bi-save me-1"></i>
                    {loading ? "Saving..." : "Save Scheme Parameters"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════ TAB 3 – SLAB CONFIGURATION ══════ */}
        {activeTab === 3 && (
          <div className={styles.tab3Container}>
            <div className={styles.tab3Header}>
              <h6 className={styles.tab3Title}>
                <i className="bi bi-table me-2"></i>Scheme-wise Slab
                Configuration – All Loan Products
              </h6>
              <div className={styles.tab3Actions}>
                <input
                  type="search"
                  autoComplete="off"
                  className={styles.searchInput}
                  placeholder="Search scheme…"
                />
                <button className={styles.btnOutlinePrimary}>
                  <i className="bi bi-download me-1"></i>Export
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={() => setShowAddSlabModal(true)}
                >
                  <i className="bi bi-plus-circle me-1"></i>Add New Slab
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
              <span className={styles.legendSuccess}>Above 800</span>
              <span className={styles.legendPrimary}>751–800</span>
              <span className={styles.legendWarning}>700–750 / -1</span>
              <span className={styles.legendDanger}>Below 700</span>
              <span className={styles.legendNote}>
                <i className="bi bi-pencil me-1"></i>Click row's edit button to
                update that score-band's ROI individually
              </span>
            </div>

            <div className={styles.configCard}>
              <div className={styles.tableResponsive}>
                <table className={styles.masterTable}>
                  <thead>
                    <tr>
                      <th>Scheme Name</th>
                      <th>Max. Loan Amt.</th>
                      <th>CIBIL / Equifax Score Band</th>
                      <th>Gender</th>
                      <th
                        className={styles.roiHighlight}
                        style={{ color: "brown" }}
                      >
                        ROI Floating (%)
                      </th>
                      <th
                        className={styles.roiHighlight}
                        style={{ color: "brown" }}
                      >
                        ROI Fixed (%)
                      </th>
                      <th>Max Loan Period</th>
                      <th style={{ width: "80px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ textAlign: "center", padding: "2rem" }}
                        >
                          Loading slabs...
                        </td>
                      </tr>
                    )}
                    {!loading && masterSlabs.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ textAlign: "center", padding: "2rem" }}
                        >
                          No slabs configured yet. Click "Add New Slab" to get
                          started.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      masterSlabs.map((product: ProductWithSchemes) => (
                        <React.Fragment key={product.id}>
                          {product.schemes &&
                            product.schemes.map((scheme: SchemeWithSlabs) => (
                              <React.Fragment key={scheme.id}>
                                <tr className={styles.schemeGroup}>
                                  <td colSpan={8}>
                                    <i className="bi bi-house-door me-2"></i>
                                    {scheme.name}
                                  </td>
                                </tr>
                                {scheme.slabs && scheme.slabs.length > 0 ? (
                                  scheme.slabs.map((slab: any) => {
                                    const getBadgeClass = (label: string) => {
                                      const lbl = label.toLowerCase();
                                      if (
                                        lbl.includes("> 800") ||
                                        lbl.includes(">800") ||
                                        lbl.includes("above 800")
                                      )
                                        return styles.badgeSuccess;
                                      if (
                                        lbl.includes("751") ||
                                        lbl.includes("800") ||
                                        lbl.includes("> 750") ||
                                        lbl.includes("780") ||
                                        lbl.includes("790")
                                      )
                                        return styles.badgePrimary;
                                      if (
                                        lbl.includes("700") ||
                                        lbl.includes("750") ||
                                        lbl.includes("-1")
                                      )
                                        return styles.badgeWarning;
                                      return styles.badgeDanger;
                                    };

                                    return (
                                      <tr key={slab.id}>
                                        <td className={styles.slabAmtCell}>
                                          {slab.slab_label}
                                        </td>
                                        <td className={styles.slabAmtCell}>
                                          {slab.max_loan_amount}
                                        </td>
                                        <td>
                                          <span
                                            className={getBadgeClass(
                                              slab.score_band?.label || "",
                                            )}
                                          >
                                            {slab.score_band?.label || "NA"}
                                          </span>
                                        </td>
                                        <td>
                                          <span
                                            className={styles.badgeSecondary}
                                          >
                                            {slab.gender}
                                          </span>
                                        </td>
                                        <td className={styles.roiHighlight}>
                                          {slab.roi_floating_pct || "-"}
                                        </td>
                                        <td className={styles.roiHighlight}>
                                          {slab.roi_fixed_pct || "-"}
                                        </td>
                                        <td>
                                          {slab.max_period_months
                                            ? `${slab.max_period_months} Months`
                                            : "-"}
                                        </td>
                                        <td>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "4px",
                                              justifyContent: "center",
                                            }}
                                          >
                                            <button
                                              className={styles.btnEditRow}
                                              onClick={() => {
                                                setEditingSlabId(slab.id);
                                                setEditSchemeId(scheme.id);
                                                loadSlabForEdit(slab);
                                                setShowEditSlabPanel(true);
                                              }}
                                              title="Edit slab"
                                            >
                                              <i className="bi bi-pencil"></i>
                                            </button>
                                            <button
                                              className={styles.btnDeleteRow}
                                              onClick={() =>
                                                handleDeleteSlab(
                                                  slab.id,
                                                  scheme.name,
                                                  slab.slab_label,
                                                )
                                              }
                                              title="Delete slab"
                                            >
                                              <i className="bi bi-trash"></i>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={8}
                                      style={{
                                        textAlign: "center",
                                        padding: "1rem",
                                        fontStyle: "italic",
                                        color: "#999",
                                      }}
                                    >
                                      No slabs configured for this scheme yet.
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableFootnotes}>
                <i className="bi bi-info-circle me-1"></i>Min. Loan Amt. for all
                loan schemes to be considered as <strong>Rs. 1000/-</strong>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <i className="bi bi-info-circle me-1"></i>Min. Loan Period for
                all loan schemes to be considered as <strong>12 Months</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ ADD NEW SLAB MODAL ═══════════════ */}
      {showAddSlabModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAddSlabModal(false)}
        >
          <div
            className={styles.modalDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-plus-square me-2"></i>Add New Slab Entry
              </h5>
              <button
                className={styles.modalClose}
                onClick={() => setShowAddSlabModal(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGrid}>
                {/* Product */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>
                    Product <span className={styles.req}>*</span>
                  </label>
                  <select
                    className={styles.modalSelect}
                    value={newSlabForm.product_id || ""}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        product_id: Number(e.target.value) || null,
                        scheme_id: null,
                      })
                    }
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scheme */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>
                    Scheme <span className={styles.req}>*</span>
                  </label>
                  <select
                    className={styles.modalSelect}
                    value={newSlabForm.scheme_id || ""}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        scheme_id: Number(e.target.value) || null,
                      })
                    }
                    disabled={!newSlabForm.product_id}
                  >
                    <option value="">-- Select Scheme --</option>
                    {slabModalSchemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loan Amt. Slab Label */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>
                    Loan Amt. Slab Label <span className={styles.req}>*</span>
                    {schemeSlabLabels.length > 0 && (
                      <small
                        style={{
                          marginLeft: "0.5rem",
                          color: "#6c757d",
                          fontWeight: "normal",
                        }}
                      >
                        ({schemeSlabLabels.length} existing label
                        {schemeSlabLabels.length > 1 ? "s" : ""} available)
                      </small>
                    )}
                  </label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="e.g. Upto Rs. 35 Lakhs"
                    value={newSlabForm.slab_label}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        slab_label: e.target.value,
                      })
                    }
                    list="slab-labels-list"
                  />
                  {schemeSlabLabels.length > 0 && (
                    <datalist id="slab-labels-list">
                      {schemeSlabLabels.map((label, index) => (
                        <option key={index} value={label} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Max Loan Amount */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>
                    Max Loan Amount <span className={styles.req}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="e.g. Rs. 3500000"
                    value={newSlabForm.max_loan_amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setNewSlabForm({
                        ...newSlabForm,
                        max_loan_amount: value,
                      });
                    }}
                  />
                </div>
              </div>

              <div className={styles.modalFormGrid}>
                {/* Score Band */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Score Band</label>
                  <select
                    className={styles.modalSelect}
                    value={newSlabForm.score_band_type}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        score_band_type: e.target.value as ScoreBandType,
                        score_band_from: "",
                        score_band_to: "",
                      })
                    }
                  >
                    <option value="NA">NA</option>
                    <option value=">">{">"}</option>
                    <option value=">=">{">="}</option>
                    <option value="<">{"<"}</option>
                    <option value="<=">{"<="}</option>
                    <option value="=">=</option>
                    <option value="Between">Between</option>
                  </select>
                  {newSlabForm.score_band_type !== "NA" &&
                    newSlabForm.score_band_type !== "Between" && (
                      <input
                        type="number"
                        className={styles.modalInputInline}
                        placeholder="Score"
                        value={newSlabForm.score_band_from}
                        onChange={(e) =>
                          setNewSlabForm({
                            ...newSlabForm,
                            score_band_from: e.target.value,
                          })
                        }
                      />
                    )}
                  {newSlabForm.score_band_type === "Between" && (
                    <div className={styles.betweenInputs}>
                      <span className={styles.betweenLabel}>From</span>
                      <input
                        type="number"
                        className={styles.modalInputSmall}
                        placeholder="700"
                        value={newSlabForm.score_band_from}
                        onChange={(e) =>
                          setNewSlabForm({
                            ...newSlabForm,
                            score_band_from: e.target.value,
                          })
                        }
                      />
                      <span className={styles.betweenLabel}>To</span>
                      <input
                        type="number"
                        className={styles.modalInputSmall}
                        placeholder="750"
                        value={newSlabForm.score_band_to}
                        onChange={(e) =>
                          setNewSlabForm({
                            ...newSlabForm,
                            score_band_to: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  <div className={styles.scoreHint}>
                    e.g. &gt; 750 | Between 700 – 750 | NA
                  </div>
                </div>

                {/* Gender */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Gender</label>
                  <select
                    className={styles.modalSelect}
                    value={newSlabForm.gender}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        gender: e.target.value as SlabGender,
                      })
                    }
                  >
                    <option value="All">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                  </select>
                </div>

                {/* Max Loan Period */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>
                    Max Loan Period (Months)
                  </label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="e.g. 84"
                    value={newSlabForm.max_loan_period}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        max_loan_period: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.modalFormGrid4}>
                {/* ROI Floating */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>ROI Floating (%)</label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="0.00"
                    step="0.01"
                    value={newSlabForm.roi_floating}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        roi_floating: e.target.value,
                      })
                    }
                  />
                </div>

                {/* ROI Fixed */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>ROI Fixed (%)</label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="0.00"
                    step="0.01"
                    value={newSlabForm.roi_fixed}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        roi_fixed: e.target.value,
                      })
                    }
                  />
                </div>

                {/* LTV */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>LTV (%)</label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="e.g. 80"
                    step="0.01"
                    value={newSlabForm.ltv}
                    onChange={(e) =>
                      setNewSlabForm({ ...newSlabForm, ltv: e.target.value })
                    }
                  />
                </div>

                {/* FOIR */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>FOIR (%)</label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="e.g. 50"
                    step="0.01"
                    value={newSlabForm.foir}
                    onChange={(e) =>
                      setNewSlabForm({ ...newSlabForm, foir: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.modalFormGrid}>
                {/* Maker Comment */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>
                    <i className="bi bi-pencil me-1"></i>Maker Comment{" "}
                    <small>(max 500)</small>
                  </label>
                  <textarea
                    className={styles.modalTextarea}
                    rows={4}
                    maxLength={500}
                    placeholder="Enter maker comment…"
                    value={newSlabForm.maker_comment}
                    onChange={(e) =>
                      setNewSlabForm({
                        ...newSlabForm,
                        maker_comment: e.target.value,
                      })
                    }
                  />
                </div>

                {mode === "checker" && (
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>
                      <i className="bi bi-check-square me-1"></i>Checker Comment{" "}
                      <small>(max 500)</small>
                    </label>
                    <textarea
                      className={styles.modalTextarea}
                      rows={4}
                      maxLength={500}
                      placeholder="Enter checker comment…"
                      value={newSlabForm.checker_comment}
                      onChange={(e) =>
                        setNewSlabForm({
                          ...newSlabForm,
                          checker_comment: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnModalCancel}
                onClick={() => setShowAddSlabModal(false)}
                disabled={loading}
              >
                <i className="bi bi-x-circle me-1"></i>Cancel
              </button>
              <button
                className={styles.btnModalSave}
                onClick={handleSaveNewSlab}
                disabled={loading}
              >
                <i className="bi bi-send-check me-1"></i>
                {loading ? "Saving..." : "Save & Send for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ EDIT SLAB SIDE PANEL ═══════════════ */}
      {showEditSlabPanel && (
        <>
          <div
            className={styles.sidePanelOverlay}
            onClick={() => setShowEditSlabPanel(false)}
          />
          <div className={styles.sidePanel}>
            <div className={styles.sidePanelHeader}>
              <h5 className={styles.sidePanelTitle}>
                <i className="bi bi-pencil-square me-2"></i>Edit Score Band
                Entry
              </h5>
              <button
                className={styles.sidePanelClose}
                onClick={() => setShowEditSlabPanel(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className={styles.sidePanelBody}>
              {/* Loan Amt. Slab Label - Now Editable */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  Loan Amt. Slab Label
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editSlabLabel}
                  onChange={(e) => setEditSlabLabel(e.target.value)}
                  placeholder="e.g. Upto Rs. 35 Lakhs"
                />
              </div>

              {/* Max. Loan Amount */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  Max. Loan Amount
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editMaxLoanAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setEditMaxLoanAmount(value);
                  }}
                  // placeholder="e.g. Rs. 35 Lakhs"
                />
              </div>

              {/* Score Band */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  Score Band
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <div className={styles.scoreEditRow}>
                  <select
                    className={styles.editSelect}
                    value={editScoreBandType}
                    onChange={(e) => {
                      setEditScoreBandType(e.target.value as ScoreBandType);
                      if (e.target.value === "NA") {
                        setEditScoreBandFrom("");
                        setEditScoreBandTo("");
                      }
                    }}
                  >
                    <option value="NA">NA</option>
                    <option value=">">{">"}</option>
                    <option value=">=">{">="}</option>
                    <option value="<">{"<"}</option>
                    <option value="<=">{"<="}</option>
                    <option value="=">=</option>
                    <option value="Between">Between</option>
                  </select>
                  {editScoreBandType !== "NA" &&
                    editScoreBandType !== "Between" && (
                      <input
                        type="number"
                        className={styles.editInputSmall}
                        value={editScoreBandFrom}
                        onChange={(e) => setEditScoreBandFrom(e.target.value)}
                      />
                    )}
                  {editScoreBandType === "Between" && (
                    <>
                      <input
                        type="number"
                        className={styles.editInputSmall}
                        placeholder="From"
                        value={editScoreBandFrom}
                        onChange={(e) => setEditScoreBandFrom(e.target.value)}
                      />
                      <span className={styles.betweenSeparator}>−</span>
                      <input
                        type="number"
                        className={styles.editInputSmall}
                        placeholder="To"
                        value={editScoreBandTo}
                        onChange={(e) => setEditScoreBandTo(e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Gender */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  Gender
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <select
                  className={styles.editSelect}
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value as SlabGender)}
                >
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Transgender">Transgender</option>
                </select>
              </div>

              {/* ROI Floating */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  ROI Floating (% p.a.)
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <div className={styles.roiInputGroup}>
                  <input
                    type="number"
                    className={styles.editInput}
                    value={editRoiFloating}
                    onChange={(e) => setEditRoiFloating(e.target.value)}
                    step="0.01"
                  />
                  <span className={styles.roiSuffix}>%</span>
                </div>
              </div>

              {/* ROI Fixed */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  ROI Fixed (% p.a.)
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <div className={styles.roiInputGroup}>
                  <input
                    type="number"
                    className={styles.editInput}
                    value={editRoiFixed}
                    onChange={(e) => setEditRoiFixed(e.target.value)}
                    step="0.01"
                  />
                  <span className={styles.roiSuffix}>%</span>
                </div>
              </div>

              {/* Max Loan Period */}
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>
                  Max Loan Period (Months)
                  <span className={styles.editBadge}>Editable</span>
                </label>
                <div className={styles.periodInputGroup}>
                  <input
                    type="number"
                    className={styles.editInput}
                    value={editMaxPeriod}
                    onChange={(e) => setEditMaxPeriod(e.target.value)}
                  />
                  <span className={styles.periodSuffix}>Months</span>
                </div>
              </div>

              {/* Info Alert */}
              <div className={styles.editInfoAlert}>
                <i className="bi bi-info-circle me-2"></i>
                Each score band has its own independent ROI. Changes here affect
                only this specific entry.
              </div>
            </div>
            <div className={styles.sidePanelFooter}>
              <button
                className={styles.btnEditSave}
                onClick={handleEditSlab}
                disabled={loading}
              >
                <i className="bi bi-check-circle me-1"></i>
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                className={styles.btnEditCancel}
                onClick={() => setShowEditSlabPanel(false)}
              >
                <i className="bi bi-x-circle me-1"></i>Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ SCHEME PARAMETERS API RESPONSE MODAL ═══════════════ */}
      {schemeParamsApiResponse && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSchemeParamsApiResponse(null)}
        >
          <div
            className={styles.modalDialog}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                <i
                  className={`bi ${schemeParamsApiResponse.status === "success" ? "bi-check-circle text-success" : schemeParamsApiResponse.status === "error" ? "bi-x-circle text-danger" : "bi-clock-history text-warning"} me-2`}
                ></i>
                {schemeParamsApiResponse.status === "success"
                  ? "Success"
                  : schemeParamsApiResponse.status === "error"
                    ? "Error"
                    : "Pending Approval"}
              </h5>
              <button
                className={styles.modalClose}
                onClick={() => setSchemeParamsApiResponse(null)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: "1rem" }}>
                {schemeParamsApiResponse.message}
              </p>
              {schemeParamsApiResponse.request_id && (
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#fff3cd",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                  }}
                >
                  <strong>Request ID:</strong>{" "}
                  {schemeParamsApiResponse.request_id}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnModalCancel}
                onClick={() => setSchemeParamsApiResponse(null)}
              >
                <i className="bi bi-x-circle me-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SLAB API RESPONSE MODAL ═══════════════ */}
      {slabApiResponse && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSlabApiResponse(null)}
        >
          <div
            className={styles.modalDialog}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                <i
                  className={`bi ${slabApiResponse.status === "success" ? "bi-check-circle text-success" : slabApiResponse.status === "error" ? "bi-x-circle text-danger" : "bi-clock-history text-warning"} me-2`}
                ></i>
                {slabApiResponse.status === "success"
                  ? "Success"
                  : slabApiResponse.status === "error"
                    ? "Error"
                    : "Pending Approval"}
              </h5>
              <button
                className={styles.modalClose}
                onClick={() => setSlabApiResponse(null)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: "1rem" }}>{slabApiResponse.message}</p>
              {slabApiResponse.request_id && (
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#fff3cd",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                  }}
                >
                  <strong>Request ID:</strong> {slabApiResponse.request_id}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnModalCancel}
                onClick={() => setSlabApiResponse(null)}
              >
                <i className="bi bi-x-circle me-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
