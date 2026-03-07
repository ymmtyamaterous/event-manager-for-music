"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { getEvent, resolveAssetUrl, updateEvent, uploadEventFlyerImage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type EventEditForm = {
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  doorsOpenTime: string;
  startTime: string;
  endTime: string;
  ticketPrice: string;
  capacity: string;
  status: "draft" | "published" | "cancelled";
};

type OrganizerEventEditPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerEventEditPage({ params }: OrganizerEventEditPageProps) {
  const normalizeTimeValue = (value: string | null | undefined): string => {
    if (!value) {
      return "";
    }
    return value.length >= 5 ? value.slice(0, 5) : value;
  };

  const { accessToken, user, isReady } = useAuth();
  const [eventId, setEventId] = useState("");
  const [form, setForm] = useState<EventEditForm>({
    title: "",
    description: "",
    venueName: "",
    venueAddress: "",
    eventDate: "",
    doorsOpenTime: "",
    startTime: "",
    endTime: "",
    ticketPrice: "",
    capacity: "",
    status: "draft",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [selectedFlyerFile, setSelectedFlyerFile] = useState<File | null>(null);
  const [flyerPreviewUrl, setFlyerPreviewUrl] = useState("");
  const flyerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadParams = async () => {
      const resolved = await params;
      setEventId(resolved.id);
    };
    void loadParams();
  }, [params]);

  useEffect(() => {
    const load = async () => {
      if (!eventId) {
        return;
      }
      if (!isReady) return;
      if (!accessToken || !user) {
        window.location.href = "/login";
        return;
      }
      if (user.user_type !== "organizer") {
        window.location.href = "/";
        return;
      }

      setError("");
      setIsLoading(true);
      try {
        const event = await getEvent(eventId);
        setForm({
          title: event.title,
          description: event.description,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          eventDate: event.eventDate,
          doorsOpenTime: normalizeTimeValue(event.doorsOpenTime),
          startTime: normalizeTimeValue(event.startTime),
          endTime: normalizeTimeValue(event.endTime),
          ticketPrice: event.ticketPrice?.toString() ?? "",
          capacity: event.capacity?.toString() ?? "",
          status: event.status,
        });
        setFlyerPreviewUrl(resolveAssetUrl(event.flyerImagePath));
      } catch (err) {
        setError(err instanceof Error ? err.message : "イベント取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, isReady, accessToken, user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventId || !accessToken) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await updateEvent(eventId, accessToken, {
        title: form.title,
        description: form.description,
        venueName: form.venueName,
        venueAddress: form.venueAddress,
        eventDate: form.eventDate,
        doorsOpenTime: form.doorsOpenTime,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        ticketPrice: form.ticketPrice ? Number(form.ticketPrice) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        status: form.status,
      });
      window.location.href = `/organizer/events/${eventId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
      setIsSubmitting(false);
    }
  };

  const handleSelectFlyerFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFlyerFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      setSelectedFlyerFile(null);
      return;
    }
    setError("");
    setSelectedFlyerFile(file);
    setFlyerPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadFlyer = async () => {
    if (!eventId || !accessToken || !selectedFlyerFile) {
      return;
    }
    setError("");
    setIsUploadingFlyer(true);
    try {
      const updated = await uploadEventFlyerImage(eventId, accessToken, selectedFlyerFile);
      setFlyerPreviewUrl(resolveAssetUrl(updated.flyerImagePath));
      setSelectedFlyerFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "フライヤー画像のアップロードに失敗しました");
    } finally {
      setIsUploadingFlyer(false);
    }
  };

  if (isLoading) {
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">イベント編集</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">必要な項目を更新してください。</p>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-5">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">フライヤー画像</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="h-44 w-full overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#060608]">
            {flyerPreviewUrl ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${flyerPreviewUrl})` }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">未設定</div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input ref={flyerInputRef} type="file" accept="image/*" onChange={handleSelectFlyerFile} className="hidden" />
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => flyerInputRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-2 border border-[rgba(255,255,255,0.12)] px-4 py-2 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6b6a75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                画像を選択
              </button>
              <span className="min-w-0 truncate font-(family-name:--font-space-mono) text-[10px] text-[#6b6a75]">
                {selectedFlyerFile ? selectedFlyerFile.name : "ファイル未選択"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleUploadFlyer}
              disabled={!selectedFlyerFile || isUploadingFlyer}
              className="shrink-0 bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-[10px] tracking-[2px] px-5 py-2 transition-colors"
            >
              {isUploadingFlyer ? "アップロード中..." : "フライヤーをアップロード"}
            </button>
          </div>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-5 space-y-4">
          <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">基本情報</h2>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">タイトル</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">説明</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
        </div>

        <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-5 space-y-4">
          <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">会場・日時</h2>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">会場名</label>
            <input
              type="text"
              required
              value={form.venueName}
              onChange={(e) => setForm((prev) => ({ ...prev, venueName: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">会場住所</label>
            <input
              type="text"
              required
              value={form.venueAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, venueAddress: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">開催日</label>
            <input
              type="date"
              required
              value={form.eventDate}
              onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">開場時間</label>
              <input
                type="time"
                required
                value={form.doorsOpenTime}
                onChange={(e) => setForm((prev) => ({ ...prev, doorsOpenTime: e.target.value }))}
                className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">開演時間</label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">終演予定時間（任意）</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
        </div>

        <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-5 space-y-4">
          <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">料金・公開設定</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">チケット料金（円）</label>
              <input
                type="number"
                min={0}
                value={form.ticketPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, ticketPrice: e.target.value }))}
                className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">定員（名）</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">ステータス</legend>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "下書き", value: "draft" },
                { label: "公開", value: "published" },
                { label: "中止", value: "cancelled" },
              ].map((item) => (
                <label key={item.value} className="flex items-center gap-2 text-sm text-[#6b6a75] cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={form.status === item.value}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, status: item.value as EventEditForm["status"] }))
                    }
                    className="accent-[#ff2d55]"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-3 transition-colors"
        >
          {isSubmitting ? "更新中..." : "更新する"}
        </button>
      </form>
    </div>
  );
}
