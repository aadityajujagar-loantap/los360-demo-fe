"use client";
import {
  useState,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  CaptchaResponse,
  fetchCaptcha,
} from "@/app/_lib/redux/services/adminApi";
import { TextField, OTPField } from "@/app/_components/fields/TextField";

type LoginForm = {
  userName: string;
  password: string;
  captcha: string;
  captcha_key: string;
  otp: string;
  reference_id: string;
};

type FieldErrors = Record<string, string[]>;

type CaptchaOtpLoginProps = {
  form: LoginForm;
  setForm: Dispatch<SetStateAction<LoginForm>>;
  errors: FieldErrors;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
  phase: "input" | "otp";
  loading: boolean;
  onResendOtp: () => void;
};

export default function CaptchaOtpLogin({
  form,
  setForm,
  errors,
  setErrors,
  phase,
  loading,
  onResendOtp,
}: CaptchaOtpLoginProps) {
  const [captchaData, setCaptchaData] = useState<CaptchaResponse["respData"] | null>(null);
  const [isFetchingCaptcha, setIsFetchingCaptcha] = useState(false);

  const getCaptcha = useCallback(async () => {
    setIsFetchingCaptcha(true);
    try {
      const data = await fetchCaptcha();
      setCaptchaData(data.respData);
      setForm((f) => ({ ...f, captcha: "", captcha_key: data.respData.captcha_key }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.captcha;
        return next;
      });
    } finally {
      setIsFetchingCaptcha(false);
    }
  }, [setErrors, setForm]);

  useEffect(() => {
    if (phase === "input" && !form.captcha_key) {
      void Promise.resolve().then(getCaptcha);
    }
  }, [form.captcha_key, getCaptcha, phase]);

  if (phase === "otp") {
    return (
      <div className="space-y-4 animate-scale-in">
        <OTPField
          label="Enter OTP"
          value={form.otp}
          onChange={(v: string) => {
            setForm((f) => ({ ...f, otp: v.replace(/\D/g, "").slice(0, 6) }));
            setErrors((prev) => {
              const next = { ...prev };
              delete next.otp;
              return next;
            });
          }}
          error={errors.otp}
        />
        <button
          type="button"
          onClick={onResendOtp}
          disabled={loading}
          className="text-xs font-semibold text-[var(--accent,#2e3192)] hover:underline disabled:opacity-50 disabled:no-underline"
        >
          Resend OTP
        </button>
      </div>
    );
  }

  // phase === "input"
  return (
    <>
      {/* Captcha */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-1 rounded-lg min-w-[130px] bg-white border border-gray-200 shadow-sm overflow-hidden">
            {isFetchingCaptcha ? (
              <div className="w-full h-[40px] flex items-center justify-center bg-gray-50">
                <div className="w-4 h-4 border-2 border-[var(--primary,#2e3192)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              captchaData?.captcha_img && (
                <img src={captchaData.captcha_img} alt="captcha" className="h-[40px] w-auto object-contain" />
              )
            )}
          </div>
          <button
            onClick={getCaptcha}
            type="button"
            disabled={isFetchingCaptcha}
            title="Refresh"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m0 0H15" />
            </svg>
          </button>
        </div>
        <TextField
          label="Enter Captcha - Case Sensitive"
          name="captcha"
          required
          value={form.captcha}
          onChange={(v: string) => {
            setForm((f) => ({ ...f, captcha: v }));
            setErrors((prev) => {
              const next = { ...prev };
              delete next.captcha;
              return next;
            });
          }}
          error={errors.captcha}
          placeholder="Enter Captcha - Case Sensitive"
        />
      </div>
    </>
  );
}
