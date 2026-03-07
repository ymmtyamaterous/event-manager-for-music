"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { APIUser, getMe, resolveAssetUrl, updateMe, uploadProfileImage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

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
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const { accessToken, isReady } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!isReady) return;
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
  }, [isReady, accessToken]);

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
    return <p className="text-sm text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-8">
      <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-3">— PROFILE</p>
      <h1 className="font-(family-name:--font-bebas-neue) text-3xl tracking-tight text-[#f0eff5]">プロフィール</h1>
      <p className="mt-1 text-sm text-[#6b6a75]">登録情報を確認・更新できます。</p>

      {error && <div className="mt-4 border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}
      {success && <div className="mt-4 border border-green-500/20 bg-green-900/20 px-4 py-3 text-sm text-green-400">{success}</div>}

      <section className="mt-6 border border-[rgba(255,255,255,0.08)] p-5">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">プロフィール画像</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-[rgba(255,255,255,0.12)] bg-[#060608]">
            {profileImageUrl ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${profileImageUrl})` }} aria-label="プロフィール画像" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-(family-name:--font-space-mono) text-[10px] tracking-wider text-[#6b6a75]">未設定</div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleSelectProfileImage} className="hidden" />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => profileImageInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 border border-[rgba(255,255,255,0.12)] bg-transparent px-3 py-2 font-(family-name:--font-space-mono) text-xs tracking-wide text-[#6b6a75] hover:text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                画像を選択
              </button>
              <span className="max-w-40 truncate font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">
                {selectedImageFile ? selectedImageFile.name : "ファイル未選択"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleUploadProfileImage}
              disabled={!selectedImageFile || isUploadingImage}
              className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-50 font-(family-name:--font-space-mono) text-xs tracking-[2px] text-white px-4 py-2 transition-colors"
            >
              {isUploadingImage ? "アップロード中..." : "画像をアップロード"}
            </button>
          </div>
        </div>
      </section>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">姓</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">名</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">表示名</label>
          <input
            type="text"
            required
            value={form.displayName}
            onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
            className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">メールアドレス</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 text-sm text-[#f0eff5] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-50 font-(family-name:--font-space-mono) text-xs tracking-[2px] text-white py-3 px-4 transition-all hover:shadow-[0_16px_40px_rgba(255,45,85,0.40)] hover:-translate-y-0.5"
        >
          {isSubmitting ? "更新中..." : "更新する"}
        </button>
      </form>
    </div>
  );
}
