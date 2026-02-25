"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { APIUser, getEvent, updateEvent } from "@/lib/api";

type EventEditForm = {
  title: string;
  description: string;
  venueName: string;
  eventDate: string;
  status: "draft" | "published" | "cancelled";
};

type OrganizerEventEditPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerEventEditPage({ params }: OrganizerEventEditPageProps) {
  const [eventId, setEventId] = useState("");
  const [form, setForm] = useState<EventEditForm>({
    title: "",
    description: "",
    venueName: "",
    eventDate: "",
    status: "draft",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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
          eventDate: event.eventDate,
          status: event.status,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "イベント取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, accessToken, user]);

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
        eventDate: form.eventDate,
        status: form.status,
      });
      window.location.href = `/organizer/events/${eventId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
      setIsSubmitting(false);
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
          <label className="mb-1 block text-sm font-semibold text-gray-700">開催日</label>
          <input
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
