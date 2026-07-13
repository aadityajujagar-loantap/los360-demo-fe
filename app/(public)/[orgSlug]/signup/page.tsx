"use client";

import { useState, use, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { orgs } from "../../../_config/orgs";
import { registerUser } from "@/app/_lib/redux/services/adminApi";

export default function OrgSignupPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const org = orgs[orgSlug];
  const auth = org?.site?.auth;
  
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.push(`/${orgSlug}${auth?.postLoginRedirect ?? "/dashboard"}`);
    }
  }, [router, orgSlug, auth]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState("");

  if (!org) return notFound();

  const primary = org.branding.primaryColor;
  const accent = org.branding.secondaryColor;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      const n = { ...fieldErrors };
      delete n[e.target.name];
      setFieldErrors(n);
    }
    setGeneralError("");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.password_confirmation) {
      setFieldErrors({ password_confirmation: ["Passwords do not match"] });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setGeneralError("");

    try {
      const res = await registerUser(form);
      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setGeneralError(data.message || "Enrollment failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("org_slug", orgSlug as string);
      }
      router.push(`/${orgSlug}${auth?.postLoginRedirect ?? "/dashboard"}`);
    } catch (err) {
      setGeneralError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: branding (Same as login for consistency) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 text-white"
        style={{ backgroundColor: accent }}
      >
        <div>
          {org?.assets?.logo && (
            <img src={org.assets.logo} alt={org.name} className="h-12 w-auto object-contain mb-12" />
          )}
          <h2 className="text-4xl font-black leading-tight mb-4 tracking-tight text-white">
            Authorized Staff<br />
            <span style={{ color: primary }}>Enrollment</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            {auth?.authTagline ?? "Establish your digital credentials for the banking portal."}
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: "📜", text: "Verified Admin Credentials" },
            { icon: "🛡️", text: "Secure Data Handling" },
            { icon: "🏛️", text: "Institutional Compliance" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-white/80 text-sm font-medium">
              <span className="text-xl">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex flex-col items-center">
            {org?.assets?.logo && (
              <img src={org.assets.logo} alt={org.name} className="h-10 w-auto object-contain mb-4" />
            )}
            <h1 className="text-xl font-black text-gray-900 leading-none">Staff Enrollment</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 border border-gray-100">
            <h1 className="text-2xl font-black text-gray-900 mb-2">Request Enrollment</h1>
            <p className="text-sm text-gray-500 mb-8 font-medium">Create your official access account.</p>

            <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                <input
                  name="name"
                  type="text"
                  autoComplete="off"
                  placeholder="Official Name"
                  value={form.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all ${
                    fieldErrors.name ? "border-red-400 ring-4 ring-red-50 bg-red-50/20" : "border-gray-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-50"
                  }`}
                  style={{ "--primary": primary } as React.CSSProperties}
                  required
                />
                {fieldErrors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase">{fieldErrors.name[0]}</p>}
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Work Email</label>
                <input
                  name="email"
                  type="email"
                  autoComplete="off"
                  placeholder="name@bank.com"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all ${
                    fieldErrors.email ? "border-red-400 ring-4 ring-red-50 bg-red-50/20" : "border-gray-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-50"
                  }`}
                  style={{ "--primary": primary } as React.CSSProperties}
                  required
                />
                {fieldErrors.email && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase">{fieldErrors.email[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Password</label>
                   <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all ${
                      fieldErrors.password ? "border-red-400 ring-4 ring-red-50 bg-red-50/20" : "border-gray-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-50"
                    }`}
                    style={{ "--primary": primary } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                   <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Confirm</label>
                   <input
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all ${
                      fieldErrors.password_confirmation ? "border-red-400 ring-4 ring-red-50 bg-red-50/20" : "border-gray-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-50"
                    }`}
                    style={{ "--primary": primary } as React.CSSProperties}
                    required
                  />
                </div>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-[10px] font-bold mt-0.5 ml-1 uppercase">{fieldErrors.password[0]}</p>}
              {fieldErrors.password_confirmation && <p className="text-red-500 text-[10px] font-bold mt-0.5 ml-1 uppercase">{fieldErrors.password_confirmation[0]}</p>}

              {generalError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-wider rounded-xl px-4 py-4 leading-relaxed text-center mt-2">
                  ⚠️ {generalError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-white text-xs uppercase tracking-[0.2em] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 shadow-[0_10px_30px_rgba(0,0,0,0.1)] mt-4"
                style={{ backgroundColor: primary }}
              >
                {loading ? "Registering..." : "Submit Enrollment →"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              Already have access?{" "}
              <Link href={`/${orgSlug}`} className="transition-colors hover:text-gray-900" style={{ color: primary }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


