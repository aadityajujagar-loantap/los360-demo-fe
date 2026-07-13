import { useState } from "react";
import { FormInput, FormSelect, SectionHeader, SectionDivider, ToggleSwitch } from "../FormPrimitives";
import { useGetPublicMasterValuesQuery, useGetPublicStatesQuery, useGetPublicDistrictsQuery } from "../../../_lib/redux/services/adminApiSlice";
import { sanitizeMobileNumber } from "../../../_lib/validation/mobile";
import { calculateAge } from "../../../_lib/validation/age";

function formatMmYyyy(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

export default function CoApplicantForm({
  i,
  co,
  setCoApp,
  errors,
  triggerMaster,
  relationshipOptions,
  genderOptions,
  occupationOptions,
  orgNatureOptions,
  businessNatureOptions,
  professionOptions,
  applicantPan,
}: any) {
  const [activatedMasters, setActivatedMasters] = useState<Record<string, boolean>>({});

  const triggerLocalMaster = (key: string) => {
    if (!activatedMasters[key]) {
      setActivatedMasters((prev) => ({ ...prev, [key]: true }));
    }
    if (triggerMaster) triggerMaster(key);
  };

  const { data: titleData = [] } = useGetPublicMasterValuesQuery("title", { skip: !activatedMasters["title"] && !co.title });
  const { data: maritalData = [] } = useGetPublicMasterValuesQuery("marital_status", { skip: !activatedMasters["marital_status"] && !co.marital_status });
  const { data: religionData = [] } = useGetPublicMasterValuesQuery("community_religion", { skip: !activatedMasters["religion"] && !co.religion });
  const { data: categoryData = [] } = useGetPublicMasterValuesQuery("category", { skip: !activatedMasters["category"] && !co.category });
  const { data: educationData = [] } = useGetPublicMasterValuesQuery("education", { skip: !activatedMasters["education"] && !co.education });
  const { data: ownershipData = [] } = useGetPublicMasterValuesQuery("permanent_residence_ownership", { skip: !activatedMasters["perm_ownership"] && !co.perm_ownership });
  const { data: presentOwnershipData = [] } = useGetPublicMasterValuesQuery("present_residence_ownership", { skip: !activatedMasters["pres_ownership"] && !co.pres_ownership });

  const { data: stateData = [] } = useGetPublicStatesQuery();
  const { data: permDistrictData = [] } = useGetPublicDistrictsQuery(co.perm_state, { skip: !co.perm_state });
  const { data: presDistrictData = [] } = useGetPublicDistrictsQuery(co.pres_state, { skip: !co.pres_state });

  const mapToOptions = (data: any[]) => data.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    const label = item.meta_value || item.name || item.label || item.value || String(item.id || '');
    const value = item.meta_key || item.id || item.value || item.name || String(item);
    return {
      label: String(label),
      value: String(value),
    };
  });

  const titleOptions = mapToOptions(titleData);
  const maritalOptions = mapToOptions(maritalData);
  const religionOptions = mapToOptions(religionData);
  const categoryOptions = mapToOptions(categoryData);
  const educationOptions = mapToOptions(educationData);
  const ownershipOptions = mapToOptions(ownershipData);
  const presentOwnershipOptions = mapToOptions(presentOwnershipData);

  const stateOptions = stateData
    .map((s: any) => {
      const label = s.state_name || s.name || s.label || s.value || "";
      return { label: String(label), value: String(label) };
    })
    .filter((option) => option.label);
  const permDistrictOptions = permDistrictData.map((d: any) => {
    const label = d.district_name || d.name || d.region_name || d.label;
    const value = label ? label.trim().replace(/\s+/g, '_') : "";
    return { label, value };
  });
  const presDistrictOptions = presDistrictData.map((d: any) => {
    const label = d.district_name || d.name || d.region_name || d.label;
    const value = label ? label.trim().replace(/\s+/g, '_') : "";
    return { label, value };
  });

  const sameAddress = co.same_address === "yes";
  const coOccupation = co.occupation?.toLowerCase();
  const coAge = calculateAge(co.dob);
  const panValue = co.pan || co.pan_number || co.pan_no || applicantPan || "";

  return (
    <div className="p-4 pt-0 border-t border-gray-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <SectionHeader title="Personal Details" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormSelect
          label="Title"
          name={`co_${i}_title`}
          required
          value={co.title || ""}
          onChange={(v) => setCoApp(i, "title", v)}
          error={errors[`co_${i}_title`]}
          options={titleOptions}
          onOpen={() => triggerLocalMaster("title")}
        />
        <FormInput
          label="First Name"
          name={`co_${i}_first_name`}
          required
          value={co.first_name || ""}
          onChange={(v) => setCoApp(i, "first_name", v)}
          error={errors[`co_${i}_first_name`]}
        />
        <FormInput
          label="Middle Name"
          name={`co_${i}_middle_name`}
          value={co.middle_name || ""}
          onChange={(v) => setCoApp(i, "middle_name", v)}
          error={errors[`co_${i}_middle_name`]}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label="Last Name"
          name={`co_${i}_last_name`}
          required
          value={co.last_name || ""}
          onChange={(v) => setCoApp(i, "last_name", v)}
          error={errors[`co_${i}_last_name`]}
        />
        <FormInput
          label="Email ID"
          name={`co_${i}_email`}
          type="email"
          required
          value={co.email || ""}
          onChange={(v) => setCoApp(i, "email", v)}
          error={errors[`co_${i}_email`]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label="Mobile Number"
          name={`co_${i}_phone`}
          type="tel"
          required
          value={co.phone || ""}
          onChange={(v) => setCoApp(i, "phone", sanitizeMobileNumber(v))}
          error={errors[`co_${i}_phone`]}
          prefix="+91"
        />
        <FormInput
          label="PAN Number"
          name={`co_${i}_pan`}
          required
          readOnly
          value={panValue}
          onChange={() => {}}
          error={errors[`co_${i}_pan`]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Relationship"
          name={`co_${i}_relationship`}
          required
          value={co.relationship || ""}
          onChange={(v) => setCoApp(i, "relationship", v)}
          error={errors[`co_${i}_relationship`]}
          options={relationshipOptions}
          onOpen={() => triggerLocalMaster("relationship")}
        />
        <FormSelect
          label="Gender"
          name={`co_${i}_gender`}
          value={co.gender || ""}
          onChange={(v) => setCoApp(i, "gender", v)}
          options={genderOptions}
          onOpen={() => triggerLocalMaster("gender")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <FormSelect
          label="Marital Status"
          name={`co_${i}_marital_status`}
          required
          value={co.marital_status || ""}
          onChange={(v) => setCoApp(i, "marital_status", v)}
          error={errors[`co_${i}_marital_status`]}
          options={maritalOptions}
          onOpen={() => triggerLocalMaster("marital_status")}
        />
        <FormInput
          label="Date of Birth"
          name={`co_${i}_dob`}
          type="date"
          required
          value={co.dob || ""}
          onChange={(v) => setCoApp(i, "dob", v)}
          error={errors[`co_${i}_dob`]}
        />
        {coAge !== null && coAge >= 0 && (
          <div className="flex items-center gap-2.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-xl font-black text-green-600">{coAge}</span>
            <span className="text-sm text-green-600 font-semibold">
              years old
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FormInput
          label="Dependents"
          name={`co_${i}_dependents`}
          type="number"
          value={co.dependents || ""}
          onChange={(v) => setCoApp(i, "dependents", v)}
        />
        <FormSelect
          label="Religion"
          name={`co_${i}_religion`}
          value={co.religion || ""}
          onChange={(v) => setCoApp(i, "religion", v)}
          options={religionOptions}
          onOpen={() => triggerLocalMaster("religion")}
        />
        <FormSelect
          label="Category"
          name={`co_${i}_category`}
          value={co.category || ""}
          onChange={(v) => setCoApp(i, "category", v)}
          options={categoryOptions}
          onOpen={() => triggerLocalMaster("category")}
        />
      </div>

      <SectionDivider />
      <SectionHeader title="Permanent Address" />
      <FormInput
        label="Address Line 1"
        name={`co_${i}_perm_addr_line1`}
        required
        value={co.perm_addr_line1 || ""}
        onChange={(v) => setCoApp(i, "perm_addr_line1", v)}
        error={errors[`co_${i}_perm_addr_line1`]}
      />
      <FormInput
        label="Address Line 2"
        name={`co_${i}_perm_addr_line2`}
        required
        value={co.perm_addr_line2 || ""}
        onChange={(v) => setCoApp(i, "perm_addr_line2", v)}
        error={errors[`co_${i}_perm_addr_line2`]}
      />
      <FormInput
        label="Address Line 3"
        name={`co_${i}_perm_addr_line3`}
        value={co.perm_addr_line3 || ""}
        onChange={(v) => setCoApp(i, "perm_addr_line3", v)}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="State"
          name={`co_${i}_perm_state`}
          required
          value={co.perm_state || ""}
          onChange={(v) => {
            setCoApp(i, { perm_state: v, perm_city: "", perm_district: "" });
          }}
          error={errors[`co_${i}_perm_state`]}
          options={stateOptions}
        />
        <FormSelect
          label="District"
          name={`co_${i}_perm_district`}
          required
          disabled={!co.perm_state}
          value={co.perm_district || co.perm_city || ""}
          onChange={(v) => {
            setCoApp(i, { perm_district: v, perm_city: v });
          }}
          error={errors[`co_${i}_perm_district`]}
          options={permDistrictOptions}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Pincode"
          name={`co_${i}_perm_pincode`}
          required
          value={co.perm_pincode || ""}
          onChange={(v) => setCoApp(i, "perm_pincode", v)}
          error={errors[`co_${i}_perm_pincode`]}
        />
        <FormSelect
          label="Ownership"
          name={`co_${i}_perm_ownership`}
          required
          value={co.perm_ownership || ""}
          onChange={(v) => setCoApp(i, "perm_ownership", v)}
          error={errors[`co_${i}_perm_ownership`]}
          options={ownershipOptions}
          onOpen={() => triggerLocalMaster("perm_ownership")}
        />
      </div>
      <FormInput
        label="Country"
        name={`co_${i}_perm_country`}
        readOnly
        value={co.perm_country || "India"}
        onChange={() => {}}
      />

      <SectionDivider />
      <div className="flex items-center justify-between mb-1">
        <SectionHeader title="Present Address" className="mb-0" />
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${!sameAddress ? "text-gray-800" : "text-gray-400"}`}>Different</span>
          <ToggleSwitch
            value={sameAddress}
            onChange={(v) => setCoApp(i, "same_address", v ? "yes" : "no")}
            labelOff="" labelOn=""
          />
          <span className={`text-xs font-semibold ${sameAddress ? "text-gray-800" : "text-gray-400"}`}>Same</span>
        </div>
      </div>
      {sameAddress ? (
        <p className="text-xs text-gray-400 italic mb-4">Same as permanent address.</p>
      ) : (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
          <FormInput
            label="Address Line 1"
            name={`co_${i}_pres_addr_line1`}
            required
            value={co.pres_addr_line1 || ""}
            onChange={(v) => setCoApp(i, "pres_addr_line1", v)}
            error={errors[`co_${i}_pres_addr_line1`]}
          />
          <FormInput
            label="Address Line 2"
            name={`co_${i}_pres_addr_line2`}
            required
            value={co.pres_addr_line2 || ""}
            onChange={(v) => setCoApp(i, "pres_addr_line2", v)}
            error={errors[`co_${i}_pres_addr_line2`]}
          />
          <FormInput
            label="Address Line 3"
            name={`co_${i}_pres_addr_line3`}
            value={co.pres_addr_line3 || ""}
            onChange={(v) => setCoApp(i, "pres_addr_line3", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="State"
              name={`co_${i}_pres_state`}
              required
              value={co.pres_state || ""}
              onChange={(v) => {
                setCoApp(i, { pres_state: v, pres_city: "", pres_district: "" });
              }}
              error={errors[`co_${i}_pres_state`]}
              options={stateOptions}
            />
            <FormSelect
              label="District"
              name={`co_${i}_pres_district`}
              required
              disabled={!co.pres_state}
              value={co.pres_district || co.pres_city || ""}
              onChange={(v) => {
                setCoApp(i, { pres_district: v, pres_city: v });
              }}
              error={errors[`co_${i}_pres_district`]}
              options={presDistrictOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Pincode"
              name={`co_${i}_pres_pincode`}
              required
              value={co.pres_pincode || ""}
              onChange={(v) => setCoApp(i, "pres_pincode", v)}
              error={errors[`co_${i}_pres_pincode`]}
            />
            <FormSelect
              label="Ownership"
              name={`co_${i}_pres_ownership`}
              required
              value={co.pres_ownership || ""}
              onChange={(v) => setCoApp(i, "pres_ownership", v)}
              error={errors[`co_${i}_pres_ownership`]}
              options={presentOwnershipOptions}
              onOpen={() => triggerLocalMaster("pres_ownership")}
            />
          </div>
          <FormInput
            label="Country"
            name={`co_${i}_pres_country`}
            readOnly
            value={co.pres_country || "India"}
            onChange={() => {}}
          />
        </div>
      )}

      <SectionDivider />
      <SectionHeader title="Financial & Employment" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormInput
          label="Monthly Income (₹)"
          name={`co_${i}_income`}
          type="number"
          required
          value={co.avg_monthly_income || ""}
          onChange={(v) => setCoApp(i, "avg_monthly_income", v)}
          error={errors[`co_${i}_income`]}
        />
        <FormInput
          label="Deductions (₹)"
          name={`co_${i}_deduction`}
          type="number"
          required
          value={co.monthly_deduction || ""}
          onChange={(v) => setCoApp(i, "monthly_deduction", v)}
          error={errors[`co_${i}_deduction`]}
        />
        <FormInput
          label="Obligations (₹)"
          name={`co_${i}_obligations`}
          type="number"
          required
          value={co.existing_monthly_obligations || ""}
          onChange={(v) => setCoApp(i, "existing_monthly_obligations", v)}
          error={errors[`co_${i}_obligations`]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Highest Education"
          name={`co_${i}_education`}
          required
          value={co.education || ""}
          onChange={(v) => setCoApp(i, "education", v)}
          error={errors[`co_${i}_education`]}
          options={educationOptions}
          onOpen={() => triggerLocalMaster("education")}
        />
        <FormSelect
          label="Occupation"
          name={`co_${i}_occupation`}
          required
          value={co.occupation || ""}
          onChange={(v) => setCoApp(i, "occupation", v)}
          error={errors[`co_${i}_occupation`]}
          options={occupationOptions}
          onOpen={() => triggerLocalMaster("occupation")}
        />
      </div>

      {coOccupation === "service" && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Employment Details</p>
          <FormInput
            label="Employer Name"
            name={`co_${i}_org_name`}
            required
            value={co.employer_name || ""}
            onChange={(v) => setCoApp(i, "employer_name", v)}
            error={errors[`co_${i}_org_name`]}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Org Nature"
              name={`co_${i}_org_nature`}
              required
              value={co.nature_of_org || ""}
              onChange={(v) => setCoApp(i, "nature_of_org", v)}
              error={errors[`co_${i}_org_nature`]}
              options={orgNatureOptions}
              onOpen={() => triggerLocalMaster("org_nature")}
            />
            <FormInput
              label="Designation"
              name={`co_${i}_designation`}
              value={co.designation || ""}
              onChange={(v) => setCoApp(i, "designation", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Total Exp (yrs)"
              name={`co_${i}_work_exp`}
              type="number"
              required
              value={co.total_work_exp || ""}
              onChange={(v) => setCoApp(i, "total_work_exp", v)}
              error={errors[`co_${i}_work_exp`]}
            />
            <FormInput
              label="Remaining (yrs)"
              name={`co_${i}_service_remaining`}
              type="number"
              required
              value={co.service_remaining || ""}
              onChange={(v) => setCoApp(i, "service_remaining", v)}
              error={errors[`co_${i}_service_remaining`]}
            />
          </div>
          <FormInput
            label="Organisation Address"
            name={`co_${i}_org_address`}
            required
            value={co.org_address || ""}
            onChange={(v) => setCoApp(i, "org_address", v)}
            error={errors[`co_${i}_org_address`]}
          />
        </div>
      )}

      {coOccupation === "business" && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Business Details</p>
          <FormInput
            label="Organisation Name"
            name={`co_${i}_org_name`}
            required
            value={co.employer_name || ""}
            onChange={(v) => setCoApp(i, "employer_name", v)}
            error={errors[`co_${i}_org_name`]}
          />
          <FormInput
            label="Business Email"
            name={`co_${i}_business_email`}
            type="email"
            value={co.business_email || ""}
            onChange={(v) => setCoApp(i, "business_email", v)}
            error={errors[`co_${i}_business_email`]}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Nature of Organisation"
              name={`co_${i}_org_nature`}
              required
              value={co.nature_of_org || ""}
              onChange={(v) => setCoApp(i, "nature_of_org", v)}
              error={errors[`co_${i}_org_nature`]}
              options={orgNatureOptions}
              onOpen={() => triggerLocalMaster("org_nature")}
            />
            <FormSelect
              label="Nature of Business"
              name={`co_${i}_business_nature`}
              required
              value={co.business_nature || ""}
              onChange={(v) => setCoApp(i, "business_nature", v)}
              error={errors[`co_${i}_business_nature`]}
              options={businessNatureOptions?.length > 0 ? businessNatureOptions : [
                { label: "Manufacturing", value: "mfg" },
                { label: "Trading", value: "trading" },
                { label: "Services", value: "services" },
                { label: "Agriculture", value: "agri" },
              ]}
              onOpen={() => triggerLocalMaster("business_nature")}
            />
          </div>
          <FormInput
            label="Business Since (MM/YYYY)"
            name={`co_${i}_business_since`}
            required
            placeholder="MM/YYYY"
            value={co.business_since || ""}
            onChange={(v) => setCoApp(i, "business_since", formatMmYyyy(v))}
            error={errors[`co_${i}_business_since`]}
          />
          <FormInput
            label="Organisation Address"
            name={`co_${i}_org_address`}
            required
            value={co.org_address || ""}
            onChange={(v) => setCoApp(i, "org_address", v)}
            error={errors[`co_${i}_org_address`]}
          />
        </div>
      )}

      {(coOccupation === "professional" || coOccupation === "self_employed") && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Professional Details</p>
          <FormSelect
            label="Profession / Expertise"
            name={`co_${i}_profession`}
            required
            value={co.profession || ""}
            onChange={(v) => setCoApp(i, "profession", v)}
            error={errors[`co_${i}_profession`]}
            options={professionOptions}
            onOpen={() => triggerLocalMaster("profession")}
          />
          <FormInput
            label="Organisation Name"
            name={`co_${i}_org_name`}
            required
            value={co.employer_name || ""}
            onChange={(v) => setCoApp(i, "employer_name", v)}
            error={errors[`co_${i}_org_name`]}
          />
          <FormInput
            label="Business Email"
            name={`co_${i}_business_email`}
            type="email"
            value={co.business_email || ""}
            onChange={(v) => setCoApp(i, "business_email", v)}
            error={errors[`co_${i}_business_email`]}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Nature of Organisation"
              name={`co_${i}_org_nature`}
              required
              value={co.nature_of_org || ""}
              onChange={(v) => setCoApp(i, "nature_of_org", v)}
              error={errors[`co_${i}_org_nature`]}
              options={orgNatureOptions}
              onOpen={() => triggerLocalMaster("org_nature")}
            />
            <FormInput
              label="Since (MM/YYYY)"
              name={`co_${i}_business_since`}
              required
              value={co.business_since || ""}
              onChange={(v) => setCoApp(i, "business_since", formatMmYyyy(v))}
              error={errors[`co_${i}_business_since`]}
            />
          </div>
          <FormInput
            label="Organisation Address"
            name={`co_${i}_org_address`}
            required
            value={co.org_address || ""}
            onChange={(v) => setCoApp(i, "org_address", v)}
            error={errors[`co_${i}_org_address`]}
          />
        </div>
      )}
    </div>
  );
}
