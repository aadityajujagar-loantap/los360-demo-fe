"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck, UserRound, Workflow } from "lucide-react";
import { orgs } from "@/app/_config/orgs";
import { loginUser } from "@/app/_lib/redux/services/adminApi";

export default function OrgLoginPage() {
  const { orgSlug } = useParams();
  const router = useRouter();
  const org = orgs[orgSlug as string];
  const auth = org?.site?.auth;

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.push(`/${orgSlug}${auth?.postLoginRedirect ?? "/dashboard"}`);
    }
  }, [router, orgSlug, auth]);

  const [form, setForm] = useState({ userName: "", password: "", captcha: "", captcha_key: "", otp: "", reference_id: "" });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const requestInFlightRef = useRef(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      const nextErrors = { ...fieldErrors };
      delete nextErrors[e.target.name];
      setFieldErrors(nextErrors);
    }
    setGeneralError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading || requestInFlightRef.current) return;

    const nextErrors: Record<string, string[]> = {};

    if (!form.userName) nextErrors.userName = ["Username is required"];
    if (!form.password) nextErrors.password = ["Password is required"];

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    requestInFlightRef.current = true;
    setLoading(true);
    setFieldErrors({});
    setGeneralError("");

    try {
      const res = await loginUser({
        userName: form.userName,
        password: form.password,
      });
      const data = await res.json();

      if (!res.ok || String(data.status) === "1" || data.status === "error" || data.status === false) {
        const message =
          data.errors?.otp?.[0] ||
          data.respData?.message ||
          data.message ||
          "Invalid credentials. Please try again.";
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setGeneralError(message);
        }
        setLoading(false);
        requestInFlightRef.current = false;
        return;
      }

      const token = data.token || data.respData?.token || data.data?.token;
      if (token) {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("org_slug", orgSlug as string);
      }
      router.push(`/${orgSlug}${auth?.postLoginRedirect ?? "/dashboard"}`);
    } catch {
      setGeneralError("Network error. Please try again.");
      setLoading(false);
      requestInFlightRef.current = false;
    }
  }

  const accent = org?.branding?.secondaryColor ?? "#1a1c54";
  const logoSrc = "/assets/iFlow.png";
  const logoAlt = "iFlow";

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(420px,0.95fr)_minmax(440px,1.05fr)]">
        <div
          className="hidden min-h-0 flex-col justify-center gap-7 overflow-hidden bg-[#111827] p-8 text-white lg:flex xl:p-10"
          style={{ background: `linear-gradient(145deg, ${accent} 0%, #111827 58%, #0F172A 100%)` }}
        >
          <div>
            <div className="max-w-md">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Workflow className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                Loan operations, controlled from one clean workspace.
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-white/70">
                Secure access for authorized teams to review applications, documents, decisions, and branch workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 items-center justify-center bg-[#F8FAFC] p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <img src={logoSrc} alt={logoAlt} className="mb-5 h-14 w-auto max-w-[220px] object-contain" />
              <h1 className="text-xl font-extrabold leading-none text-[#111827]">Admin Login</h1>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-7">
                <div className="mb-4 hidden lg:block">
                  <img src={logoSrc} alt={logoAlt} className="h-16 w-auto max-w-[240px] object-contain" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Sign in</h1>
                <p className="mt-1.5 text-xs font-semibold text-[#64748B]">
                  Authorized iFlow staff only.
                </p>
                <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-[#4F46E5]">
                  Dummy login: SADMIN / SuperAdmin@123
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#64748B]">
                    Username
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      name="userName"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter username"
                      value={form.userName}
                      onChange={handleChange}
                      className={`h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-xs font-semibold text-[#1E293B] outline-none transition-all ${
                        fieldErrors.userName
                          ? "border-red-300 bg-red-50/30 ring-3 ring-red-50"
                          : "border-[#E2E8F0] focus:border-[#5F39F8] focus:ring-3 focus:ring-indigo-50"
                      }`}
                      required
                    />
                  </div>
                  {fieldErrors.userName && (
                    <p className="mt-1.5 text-[10px] font-bold uppercase text-red-500">{fieldErrors.userName[0]}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#64748B]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter password"
                      value={form.password}
                      onChange={handleChange}
                      className={`h-10 w-full rounded-lg border bg-white pl-9 pr-10 text-xs font-semibold text-[#1E293B] outline-none transition-all ${
                        fieldErrors.password
                          ? "border-red-300 bg-red-50/30 ring-3 ring-red-50"
                          : "border-[#E2E8F0] focus:border-[#5F39F8] focus:ring-3 focus:ring-indigo-50"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#94A3B8] transition-colors hover:bg-slate-100 hover:text-[#475569]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1.5 text-[10px] font-bold uppercase text-red-500">{fieldErrors.password[0]}</p>
                  )}
                </div>

                {generalError && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-[11px] font-bold leading-relaxed text-red-600">
                    {generalError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#5F39F8] text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#4F2EE0] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Authorize Access"}
                </button>
              </form>
            </div>

            <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
              iFlow secure loan operations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
