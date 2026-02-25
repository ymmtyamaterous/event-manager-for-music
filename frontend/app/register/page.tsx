"use client";

import { FormEvent, useMemo, useState } from "react";
import { RegisterFormData } from "@/types";
import { register } from "@/lib/api";

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
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">新規登録</h1>
      <p className="mt-1 text-sm text-gray-600">必要情報を入力してアカウントを作成してください。</p>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">ユーザー種別</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: "ライブ運営", value: "organizer" },
              { label: "出演者", value: "performer" },
              { label: "観客", value: "audience" },
            ].map((role) => (
              <label key={role.value} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2">
                <input
                  type="radio"
                  name="userType"
                  checked={form.userType === role.value}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      userType: role.value as RegisterFormData["userType"],
                    }))
                  }
                />
                <span className="text-sm text-gray-700">{role.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">姓</label>
            <input
              type="text"
              required
              placeholder="山田"
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">名</label>
            <input
              type="text"
              required
              placeholder="太郎"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">表示用ニックネーム</label>
          <input
            type="text"
            required
            value={form.displayName}
            onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">メールアドレス</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">パスワード</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">パスワード（確認）</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {confirmError && <p className="mt-1 text-xs text-red-600">{confirmError}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.agreedToTerms}
            onChange={(e) => setForm((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
          />
          利用規約に同意します
        </label>

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "登録中..." : "登録する"}
        </button>
      </form>
    </div>
  );
}
