"use client";

import { FormEvent, useMemo, useState } from "react";
import { RegisterFormData } from "@/types";
import { register } from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";

const initialForm: RegisterFormData = {
  userType: "audience",
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreedToTerms: false,
};

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const passwordError = useMemo(() => {
    if (form.password.length === 0) {
      return "";
    }
    if (!passwordPattern.test(form.password)) {
      return "パスワードは8文字以上かつ英数字混在で入力してください";
    }
    return "";
  }, [form.password]);

  const confirmError = useMemo(() => {
    if (form.confirmPassword.length === 0) {
      return "";
    }
    if (form.password !== form.confirmPassword) {
      return "パスワードが一致しません";
    }
    return "";
  }, [form.password, form.confirmPassword]);

  const isDisabled =
    isSubmitting || !form.agreedToTerms || Boolean(passwordError) || Boolean(confirmError);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (passwordError || confirmError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(form);

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("user", JSON.stringify(result.user));

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-8">
      <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-3">— SIGN UP</p>
      <h1 className="font-(family-name:--font-bebas-neue) text-3xl tracking-tight text-[#f0eff5]">新規登録</h1>
      <p className="mt-1 text-sm text-[#6b6a75]">必要情報を入力してアカウントを作成してください。</p>

      {error && (
        <div className="mt-4 border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <fieldset>
          <legend className="mb-2 font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">ユーザー種別</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: "ライブ運営", value: "organizer" },
              { label: "出演者", value: "performer" },
              { label: "観客", value: "audience" },
            ].map((role) => (
              <label
                key={role.value}
                className={`flex items-center gap-2 border p-3 cursor-pointer transition-colors ${
                  form.userType === role.value
                    ? "border-[#ff2d55] bg-[rgba(255,45,85,0.08)]"
                    : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                }`}
              >
                <input
                  type="radio"
                  name="userType"
                  className="accent-[#ff2d55]"
                  checked={form.userType === role.value}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      userType: role.value as RegisterFormData["userType"],
                    }))
                  }
                />
                <span className="text-sm text-[#f0eff5]">{role.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">姓</label>
            <input
              type="text"
              required
              placeholder="山田"
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">名</label>
            <input
              type="text"
              required
              placeholder="太郎"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">表示用ニックネーム</label>
          <input
            type="text"
            required
            value={form.displayName}
            onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
            className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">メールアドレス</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">パスワード</label>
            <PasswordInput
              required
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">パスワード（確認）</label>
            <PasswordInput
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
            {confirmError && <p className="mt-1 text-xs text-red-400">{confirmError}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#6b6a75] cursor-pointer">
          <input
            type="checkbox"
            className="accent-[#ff2d55]"
            checked={form.agreedToTerms}
            onChange={(e) => setForm((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
          />
          利用規約に同意します
        </label>

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-50 font-(family-name:--font-space-mono) text-xs tracking-[2px] text-white py-3 px-4 transition-all hover:shadow-[0_16px_40px_rgba(255,45,85,0.40)] hover:-translate-y-0.5"
        >
          {isSubmitting ? "登録中..." : "登録する"}
        </button>
      </form>
    </div>
  );
}
