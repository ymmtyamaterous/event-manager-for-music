"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listOrganizerEvents } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { EventCard } from "@/types";

export default function OrganizerPage() {
  const { user, isReady } = useAuth();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isReady) return;
      if (!user) {
        window.location.href = "/login";
        return;
      }
      if (user.user_type !== "organizer") {
        window.location.href = "/";
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const owned = await listOrganizerEvents(user.id);
        setEvents(owned ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "イベント取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [isReady, user]);

  const publishedEvents = events.filter((event) => event.status === "published");
  const draftEvents = events.filter((event) => event.status === "draft");

  if (isLoading) {
    return <p className="text-sm text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-2">— ORGANIZER</p>
          <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-tight text-[#f0eff5]">運営ダッシュボード</h1>
          <p className="mt-1 text-sm text-[#6b6a75]">イベント作成と公開状況の管理</p>
        </div>
        <Link
          href="/organizer/events/new"
          className="font-(family-name:--font-space-mono) text-xs tracking-[2px] bg-[#ff2d55] hover:bg-[#ff5470] text-white py-2.5 px-5 transition-all hover:shadow-[0_16px_40px_rgba(255,45,85,0.35)]"
        >
          + 新規イベント作成
        </Link>
      </div>

      {error && <div className="border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-px md:grid-cols-3">
        <article className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">総イベント数</p>
          <p className="mt-1 font-(family-name:--font-bebas-neue) text-4xl text-[#f0eff5]">{events.length}</p>
        </article>
        <article className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">公開中</p>
          <p className="mt-1 font-(family-name:--font-bebas-neue) text-4xl text-[#ff2d55]">{publishedEvents.length}</p>
        </article>
        <article className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">下書き</p>
          <p className="mt-1 font-(family-name:--font-bebas-neue) text-4xl text-[#f0eff5]">{draftEvents.length}</p>
        </article>
      </div>

      <section className="space-y-3">
        <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">公開中イベント</h2>
        {publishedEvents.length === 0 ? (
          <p className="text-sm text-[#6b6a75]">公開中イベントはありません。</p>
        ) : (
          <div className="space-y-3">
            {publishedEvents.map((event) => (
              <article key={event.id} className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5 transition-colors hover:border-[rgba(255,255,255,0.15)]">
                <div className="inline-flex bg-[rgba(255,45,85,0.15)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#ff2d55]">公開中</div>
                <h3 className="mt-2 text-base font-bold text-[#f0eff5]">{event.title}</h3>
                <p className="text-xs text-[#6b6a75]">📅 {event.eventDate} / 📍 {event.venueName}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/organizer/events/${event.id}`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    詳細
                  </Link>
                  <Link href={`/organizer/events/${event.id}/entries`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    エントリー
                  </Link>
                  <Link href={`/organizer/events/${event.id}/performances`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    タイムテーブル
                  </Link>
                  <Link href={`/organizer/events/${event.id}/announcements`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    お知らせ
                  </Link>
                  <Link href={`/organizer/events/${event.id}/edit`} className="bg-[#ff2d55] hover:bg-[#ff5470] text-white font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    編集
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">下書きイベント</h2>
        {draftEvents.length === 0 ? (
          <p className="text-sm text-[#6b6a75]">下書きイベントはありません。</p>
        ) : (
          <div className="space-y-3">
            {draftEvents.map((event) => (
              <article key={event.id} className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5 transition-colors hover:border-[rgba(255,255,255,0.15)]">
                <div className="inline-flex bg-white/5 px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75]">下書き</div>
                <h3 className="mt-2 text-base font-bold text-[#f0eff5]">{event.title}</h3>
                <p className="text-xs text-[#6b6a75]">📅 {event.eventDate} / 📍 {event.venueName}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/organizer/events/${event.id}`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    詳細
                  </Link>
                  <Link href={`/organizer/events/${event.id}/entries`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    エントリー
                  </Link>
                  <Link href={`/organizer/events/${event.id}/performances`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    タイムテーブル
                  </Link>
                  <Link href={`/organizer/events/${event.id}/announcements`} className="border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    お知らせ
                  </Link>
                  <Link href={`/organizer/events/${event.id}/edit`} className="bg-[#ff2d55] hover:bg-[#ff5470] text-white font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors">
                    編集
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
