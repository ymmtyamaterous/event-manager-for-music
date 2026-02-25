"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APIUser, deleteEvent, getEvent } from "@/lib/api";
import { EventCard } from "@/types";

type OrganizerEventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerEventDetailPage({ params }: OrganizerEventDetailPageProps) {
  const [eventId, setEventId] = useState("");
  const [event, setEvent] = useState<EventCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const detail = await getEvent(eventId);
        setEvent(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "イベント取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, accessToken, user]);

  const handleDelete = async () => {
    if (!eventId || !accessToken) {
      return;
    }
    setIsDeleting(true);
    setError("");
    try {
      await deleteEvent(eventId, accessToken);
      window.location.href = "/organizer";
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  if (!event) {
    return <p className="text-sm text-gray-600">イベントが見つかりません。</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="mt-1 text-sm text-gray-600">運営者用イベント詳細</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            編集
          </Link>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">基本情報</h2>
        <div className="mt-3 space-y-1 text-sm text-gray-700">
          <p>📅 開催日: {event.eventDate}</p>
          <p>📍 会場: {event.venueName}</p>
          <p>🎫 料金: {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
          <p>👥 定員: {event.capacity ?? "未定"}名</p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">管理リンク</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/organizer/events/${event.id}/reservations`}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            予約者一覧
          </Link>
          <Link
            href={`/organizer/events/${event.id}/announcements`}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            お知らせ管理
          </Link>
        </div>
      </section>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900">イベントを削除しますか？</h3>
            <p className="mt-2 text-sm text-gray-600">この操作は取り消せません。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
