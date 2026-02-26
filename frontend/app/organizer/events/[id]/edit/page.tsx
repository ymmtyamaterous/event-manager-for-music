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
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">イベント編集</h1>
      <p className="mt-1 text-sm text-gray-600">必要な項目を更新してください。</p>

      {error && <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="mt-5 rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">フライヤー画像</h2>
        <div className="mt-3 flex flex-col gap-4">
          <div className="h-44 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            {flyerPreviewUrl ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${flyerPreviewUrl})` }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">未設定</div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input ref={flyerInputRef} type="file" accept="image/*" onChange={handleSelectFlyerFile} className="hidden" />
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => flyerInputRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                画像を選択
              </button>
              <span className="min-w-0 truncate text-sm text-gray-500">
                {selectedFlyerFile ? selectedFlyerFile.name : "ファイル未選択"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleUploadFlyer}
              disabled={!selectedFlyerFile || isUploadingFlyer}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isUploadingFlyer ? "アップロード中..." : "フライヤーをアップロード"}
            </button>
          </div>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">タイトル</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">説明</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">会場名</label>
          <input
            type="text"
            required
            value={form.venueName}
            onChange={(e) => setForm((prev) => ({ ...prev, venueName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">会場住所</label>
          <input
            type="text"
            required
            value={form.venueAddress}
            onChange={(e) => setForm((prev) => ({ ...prev, venueAddress: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">開催日</label>
          <input
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">開場時間</label>
            <input
              type="time"
              required
              value={form.doorsOpenTime}
              onChange={(e) => setForm((prev) => ({ ...prev, doorsOpenTime: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">開演時間</label>
            <input
              type="time"
              required
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">終演予定時間（任意）</label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">チケット料金（円）</label>
            <input
              type="number"
              min={0}
              value={form.ticketPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, ticketPrice: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">定員（名）</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">ステータス</legend>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "下書き", value: "draft" },
              { label: "公開", value: "published" },
              { label: "中止", value: "cancelled" },
            ].map((item) => (
              <label key={item.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === item.value}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, status: item.value as EventEditForm["status"] }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

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
