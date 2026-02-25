"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LoginFormData } from "@/types";
import { login } from "@/lib/api";

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
    <div className="mx-auto max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
      <p className="mt-1 text-sm text-gray-600">メールアドレスとパスワードを入力してください。</p>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-700">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-700">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        アカウントをお持ちでないですか？{" "}
        <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
          新規登録はこちら
        </Link>
      </p>
    </div>
  );
}
