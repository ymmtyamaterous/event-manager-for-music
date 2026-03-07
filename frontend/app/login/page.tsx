"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LoginFormData } from "@/types";
import { login } from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginPage() {
  const [form, setForm] = useState<LoginFormData>({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(form);

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("user", JSON.stringify(result.user));

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-8">
      <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-3">— SIGN IN</p>
      <h1 className="font-(family-name:--font-bebas-neue) text-3xl tracking-tight text-[#f0eff5]">ログイン</h1>
      <p className="mt-1 text-sm text-[#6b6a75]">メールアドレスとパスワードを入力してください。</p>

      {error && (
        <div className="mt-4 border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">
            パスワード
          </label>
          <PasswordInput
            id="password"
            required
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-50 font-(family-name:--font-space-mono) text-xs tracking-[2px] text-white py-3 px-4 transition-all hover:shadow-[0_16px_40px_rgba(255,45,85,0.40)] hover:-translate-y-0.5"
        >
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <p className="mt-5 text-sm text-[#6b6a75]">
        アカウントをお持ちでないですか？{" "}
        <Link href="/register" className="text-[#ff2d55] hover:text-[#ff5470] transition-colors">
          新規登録はこちら
        </Link>
      </p>
    </div>
  );
}
