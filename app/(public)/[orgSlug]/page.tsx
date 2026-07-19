"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
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

  const logoSrc = "/images/LOS360-logo.png";
  const logoAlt = "LOS360";
  const applyLoanLink = org?.site?.nav?.links.find((link) => link.label.toLowerCase() === "apply loan");

  return (
    <div className="relative h-full overflow-hidden bg-[#F4F6FF] text-[#191345]">
      <div className="absolute inset-0 hidden overflow-hidden lg:block">
        <div
          className="absolute left-[55.5vw] top-[-21vh] h-[142vh] w-[72vw] overflow-hidden rounded-[50%] bg-cover bg-center"
          style={{
            backgroundImage: "linear-gradient(rgba(25,19,69,0.08), rgba(25,19,69,0.08)), url('/login-bg.png')",
          }}
        />
        <div
          className="absolute left-[55.5vw] top-[-21vh] h-[142vh] w-[72vw] rounded-[50%] border border-[#2E3192]/30"
          aria-hidden="true"
        />
      </div>

      <div className="absolute left-0 bottom-6 hidden h-40 w-[31%] opacity-25 lg:block">
        <div
          className="h-full w-full"
          style={{
            background:
              "repeating-radial-gradient(ellipse at 45% 110%, transparent 0, transparent 24px, #2E3192 25px, #2E3192 27px, transparent 28px, transparent 54px)",
          }}
        />
      </div>

      <div className="absolute right-7 top-6 z-20 hidden items-start gap-3 lg:flex xl:right-8">
        {applyLoanLink?.children?.length ? (
          <div className="group relative">
            <button
              type="button"
              className="flex h-[66px] min-w-[168px] items-center justify-between gap-3 rounded-[14px] bg-white/92 px-5 text-[13px] font-extrabold text-[#191345] shadow-[0_18px_45px_rgba(25,19,69,0.12)] ring-1 ring-white/80 backdrop-blur transition-colors hover:text-[#2E3192]"
            >
              <span>{applyLoanLink.label}</span>
              <ChevronDown className="h-4 w-4 text-[#2E3192] transition-transform group-hover:rotate-180" />
            </button>

            <div className="invisible absolute right-0 top-full z-30 w-[230px] pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white py-1.5 shadow-[0_20px_55px_rgba(25,19,69,0.16)]">
                {applyLoanLink.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="block px-4 py-2.5 text-[13px] font-bold text-[#4B5563] transition-colors hover:bg-[#F0F4FF] hover:text-[#2E3192]"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex w-[224px] rounded-[14px] bg-white/92 px-5 py-3 shadow-[0_18px_45px_rgba(25,19,69,0.12)] ring-1 ring-white/80 backdrop-blur">
          <Headphones className="mr-4 mt-3 h-5 w-5 text-[#2E3192]" />
          <div>
            <p className="text-[11px] font-extrabold text-[#2E3192]">Need help?</p>
            <p className="mt-1 text-[13px] font-extrabold text-[#191345]">support@iflow.com</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid h-full min-w-0 grid-cols-1 lg:grid-cols-[52%_48%]">
        <section className="flex h-full min-w-0 min-h-0 items-center justify-start px-4 py-6 sm:justify-center sm:px-8 lg:justify-start lg:px-[12vw] xl:px-[12.1vw]">
          <div className="w-full max-w-[340px] min-w-0 sm:max-w-[420px] [@media(max-height:740px)]:max-w-[390px] [@media(max-height:740px)]:-translate-y-2">
            <img src={logoSrc} alt={logoAlt} className="mb-3 h-auto w-[128px] object-contain sm:mb-3 [@media(max-height:740px)]:mb-2 [@media(max-height:740px)]:w-[118px]" />

            <div className="min-w-0 overflow-hidden rounded-[14px] bg-white/95 px-5 py-5 shadow-[0_24px_60px_rgba(25,19,69,0.11)] sm:px-9 sm:py-7 [@media(max-height:740px)]:px-7 [@media(max-height:740px)]:py-5 max-[480px]:px-5">
              <div className="mb-5 [@media(max-height:740px)]:mb-3">
                <h1 className="text-[28px] font-black leading-none tracking-[0] text-[#21145F] [@media(max-height:740px)]:text-[24px]">Welcome Back!</h1>
                <div className="mt-2 h-[3px] w-9 rounded-full bg-[#2E3192]" />
                <p className="mt-3 text-[15px] font-medium text-[#687086] [@media(max-height:740px)]:mt-2 [@media(max-height:740px)]:text-[13px]">Sign in to your iFlow account</p>
                <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-[#4F46E5]">
                  Dummy login: SADMIN / SuperAdmin@123
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 [@media(max-height:740px)]:space-y-2.5" autoComplete="off">
                <div>
                  <label className="mb-2 block text-[13px] font-extrabold text-[#191345] [@media(max-height:740px)]:mb-1">
                    User ID
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-[#F0F4FF] text-[#2E3192]">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <input
                      name="userName"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter your User ID"
                      value={form.userName}
                      onChange={handleChange}
                      className={`h-11 min-w-0 w-full rounded-lg border bg-white pl-12 pr-3 text-[14px] font-semibold text-[#191345] shadow-[0_7px_18px_rgba(25,19,69,0.05)] outline-none transition-all placeholder:text-[#9AA1B7] [@media(max-height:740px)]:h-10 ${
                        fieldErrors.userName
                          ? "border-red-300 bg-red-50/30 ring-3 ring-red-50"
                          : "border-[#DBE1EE] focus:border-[#2E3192] focus:ring-3 focus:ring-[#2E3192]/10"
                      }`}
                      required
                    />
                  </div>
                  {fieldErrors.userName && (
                    <p className="mt-1.5 text-[10px] font-bold uppercase text-red-500">{fieldErrors.userName[0]}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-extrabold text-[#191345] [@media(max-height:740px)]:mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-[#F0F4FF] text-[#2E3192]">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter your Password"
                      value={form.password}
                      onChange={handleChange}
                      className={`h-11 min-w-0 w-full rounded-lg border bg-white pl-12 pr-11 text-[14px] font-semibold text-[#191345] shadow-[0_7px_18px_rgba(25,19,69,0.05)] outline-none transition-all placeholder:text-[#9AA1B7] [@media(max-height:740px)]:h-10 ${
                        fieldErrors.password
                          ? "border-red-300 bg-red-50/30 ring-3 ring-red-50"
                          : "border-[#DBE1EE] focus:border-[#2E3192] focus:ring-3 focus:ring-[#2E3192]/10"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#9AA1B7] transition-colors hover:bg-[#F0F4FF] hover:text-[#2E3192]"
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[12px] font-extrabold text-[#2E3192] transition-colors hover:text-[#1A1C54] [@media(max-height:740px)]:text-[11px]"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2E3192] text-[14px] font-extrabold text-white shadow-[0_15px_30px_rgba(46,49,146,0.25)] transition-all hover:bg-[#1A1C54] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:740px)]:h-10"
                >
                  <LockKeyhole className="h-4 w-4" />
                  {loading ? "Verifying..." : "Authorize Access"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="pointer-events-none relative hidden h-full min-h-0 lg:block">
          <div className="absolute bottom-7 right-11 w-[45vw] max-w-[715px] rounded-[20px] bg-white/93 p-7 shadow-[0_26px_70px_rgba(25,19,69,0.15)] ring-1 ring-white/80 backdrop-blur xl:right-11 [@media(max-width:1180px)]:right-7 [@media(max-width:1180px)]:w-[46vw] [@media(max-height:740px)]:bottom-5 [@media(max-height:740px)]:p-6">
            <div className="pointer-events-none absolute right-9 top-8 text-[#2E3192]/10">
              <ShieldCheck className="h-24 w-24 stroke-[1.6]" />
            </div>

            <div className="relative max-w-[560px]">
              <h2 className="text-[26px] font-black leading-tight tracking-[0] text-[#191345] [@media(max-height:740px)]:text-[22px]">Secure. Smart. Seamless.</h2>
              <div className="mt-2 h-[3px] w-9 rounded-full bg-[#2E3192]" />
              <p className="mt-3 max-w-[515px] text-[16px] font-medium leading-6 text-[#657087] [@media(max-height:740px)]:mt-3 [@media(max-height:740px)]:text-[14px] [@media(max-height:740px)]:leading-6">
                Multi-layer authentication ensures your account remains protected at all times.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-[#E1E5F0] [@media(max-height:740px)]:mt-4">
              <div className="px-5 text-center first:pl-0">
                <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#F0F4FF] text-[#2E3192]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="mt-3 text-[13px] font-black text-[#191345]">Secure Access</p>
                <p className="mt-1 text-[12px] font-medium leading-4 text-[#657087]">Protected with advanced encryption</p>
              </div>

              <div className="px-5 text-center">
                <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#F0F4FF] text-[#2E3192]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <p className="mt-3 text-[13px] font-black text-[#191345]">Instant Access</p>
                <p className="mt-1 text-[12px] font-medium leading-4 text-[#657087]">Quick and secure authentication</p>
              </div>

              <div className="px-5 text-center last:pr-0">
                <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#F0F4FF] text-[#2E3192]">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <p className="mt-3 text-[13px] font-black text-[#191345]">Your Privacy</p>
                <p className="mt-1 text-[12px] font-medium leading-4 text-[#657087]">We never share your information</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
