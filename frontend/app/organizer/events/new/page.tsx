"use client";

import { FormEvent, useState } from "react";
import { createEvent } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type EventForm = {
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
  status: "draft" | "published";
};

const initialForm: EventForm = {
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
};

export default function NewOrganizerEventPage() {
  const { accessToken, user } = useAuth();
  const [form, setForm] = useState<EventForm>(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken) {
      window.location.href = "/login";
      return;
    }
    if (user?.user_type !== "organizer") {
      window.location.href = "/";
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const created = await createEvent(accessToken, {
        title: form.title,
        description: form.description || undefined,
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

      window.location.href = `/events/${created.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "イベント作成に失敗しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">新規イベント作成</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">必要項目を入力して下書きまたは公開します。</p>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-5 space-y-4">
          <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">基本情報</h2>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">イベントタイトル</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">イベント説明</label>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-[#6b6a75] cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === "draft"}
                  onChange={() => setForm((prev) => ({ ...prev, status: "draft" }))}
                  className="accent-[#ff2d55]"
                />
                下書き
              </label>
              <label className="flex items-center gap-2 text-sm text-[#6b6a75] cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === "published"}
                  onChange={() => setForm((prev) => ({ ...prev, status: "published" }))}
                  className="accent-[#ff2d55]"
                />
                公開
              </label>
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-3 transition-colors"
        >
          {isSubmitting ? "作成中..." : "イベントを作成"}
        </button>
      </form>
    </div>
  );
}
