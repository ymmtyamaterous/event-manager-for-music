"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteEvent, getEvent } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { EventCard } from "@/types";

type OrganizerEventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerEventDetailPage({ params }: OrganizerEventDetailPageProps) {
  const { accessToken, user, isReady } = useAuth();
  const [eventId, setEventId] = useState("");
  const [event, setEvent] = useState<EventCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const detail = await getEvent(eventId);
        setEvent(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "イベント取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, isReady, accessToken, user]);

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
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  if (!event) {
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">イベントが見つかりません。</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">{event.title}</h1>
          <p className="mt-1 text-sm text-[#6b6a75]">運営者用イベント詳細</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="bg-[#ff2d55] hover:bg-[#ff5470] text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2.5 px-5 transition-colors"
          >
            編集
          </Link>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="border border-[rgba(255,45,85,0.4)] hover:border-[#ff2d55] text-[#ff5470] hover:text-[#ff2d55] font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2.5 px-5 transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">基本情報</h2>
        <div className="mt-3 space-y-1.5 text-sm text-[#f0eff5]">
          <p>📅 開催日: {event.eventDate}</p>
          <p>📍 会場: {event.venueName}</p>
          <p>🎫 料金: {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
          <p>👥 定員: {event.capacity ?? "未定"}名</p>
        </div>
      </section>

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase mb-4">管理リンク</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/organizer/events/${event.id}/reservations`}
            className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-2 px-4 transition-colors"
          >
            予約者一覧
          </Link>
          <Link
            href={`/organizer/events/${event.id}/announcements`}
            className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-2 px-4 transition-colors"
          >
            お知らせ管理
          </Link>
          <Link
            href={`/organizer/events/${event.id}/entries`}
            className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-2 px-4 transition-colors"
          >
            エントリー申請管理
          </Link>
          <Link
            href={`/organizer/events/${event.id}/performances`}
            className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-2 px-4 transition-colors"
          >
            タイムテーブル管理
          </Link>
        </div>
      </section>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6 w-full max-w-md mx-4">
            <h3 className="font-(family-name:--font-bebas-neue) text-2xl tracking-wider text-[#f0eff5]">イベントを削除しますか？</h3>
            <p className="mt-2 text-sm text-[#6b6a75]">この操作は取り消せません。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="border border-[rgba(255,45,85,0.4)] hover:border-[#ff2d55] disabled:opacity-60 text-[#ff5470] hover:text-[#ff2d55] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
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
