"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { APIUser, getMe, resolveAssetUrl, updateMe, uploadProfileImage } from "@/lib/api";

type ProfileForm = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const accessToken = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("access_token") ?? "";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!accessToken) {
        window.location.href = "/login";
        return;
      }

      setError("");
      setIsLoading(true);
      try {
        const me = await getMe(accessToken);
        applyUserToForm(me);
      } catch (err) {
        setError(err instanceof Error ? err.message : "プロフィール取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [accessToken]);

  const applyUserToForm = (user: APIUser) => {
    setForm({
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      displayName: user.display_name ?? "",
      email: user.email ?? "",
    });
    setProfileImageUrl(resolveAssetUrl(user.profile_image_path));
  };

  const handleSelectProfileImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImageFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      setSelectedImageFile(null);
      return;
    }

    setError("");
    setSelectedImageFile(file);
    setProfileImageUrl(URL.createObjectURL(file));
  };

  const handleUploadProfileImage = async () => {
    if (!accessToken || !selectedImageFile) {
      return;
    }

    setError("");
    setSuccess("");
    setIsUploadingImage(true);
    try {
      const updated = await uploadProfileImage(accessToken, selectedImageFile);
      localStorage.setItem("user", JSON.stringify(updated));
      setSelectedImageFile(null);
      applyUserToForm(updated);
      setSuccess("プロフィール画像を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "プロフィール画像のアップロードに失敗しました");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const updated = await updateMe(accessToken, form);
      localStorage.setItem("user", JSON.stringify(updated));
      setSuccess("プロフィールを更新しました");
      applyUserToForm(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
      <p className="mt-1 text-sm text-gray-600">登録情報を確認・更新できます。</p>

      {error && <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {success && <div className="mt-4 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm">{success}</div>}

      <section className="mt-5 rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">プロフィール画像</h2>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="プロフィール画像" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">未設定</div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input type="file" accept="image/*" onChange={handleSelectProfileImage} className="block w-full text-sm text-gray-700" />
            <button
              type="button"
              onClick={handleUploadProfileImage}
              disabled={!selectedImageFile || isUploadingImage}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isUploadingImage ? "アップロード中..." : "画像をアップロード"}
            </button>
          </div>
        </div>
      </section>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">姓</label>
            <input
              type="text"
              required
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
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">表示名</label>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "更新中..." : "更新する"}
        </button>
      </form>
    </div>
  );
}
