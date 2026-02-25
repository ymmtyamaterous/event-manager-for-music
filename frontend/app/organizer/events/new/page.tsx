"use client";

import { FormEvent, useMemo, useState } from "react";
import { APIUser, createEvent } from "@/lib/api";

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
  const [form, setForm] = useState<EventForm>(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessToken = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("access_token") ?? "";
  }, []);

  const user = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = localStorage.getItem("user");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as APIUser;
    } catch {
      return null;
    }
  }, []);

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
        <h1 className="text-3xl font-bold text-gray-900">新規イベント作成</h1>
        <p className="mt-1 text-sm text-gray-600">必要項目を入力して下書きまたは公開します。</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">基本情報</h2>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">イベントタイトル</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">イベント説明</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">会場・日時</h2>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">料金・公開設定</h2>
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
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === "draft"}
                  onChange={() => setForm((prev) => ({ ...prev, status: "draft" }))}
                />
                下書き
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === "published"}
                  onChange={() => setForm((prev) => ({ ...prev, status: "published" }))}
                />
                公開
              </label>
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "作成中..." : "イベントを作成"}
        </button>
      </form>
    </div>
  );
}
