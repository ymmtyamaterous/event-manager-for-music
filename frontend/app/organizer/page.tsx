"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APIUser, listOrganizerEvents } from "@/lib/api";
import { EventCard } from "@/types";

export default function OrganizerPage() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    const load = async () => {
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
  }, [user]);

  const publishedEvents = events.filter((event) => event.status === "published");
  const draftEvents = events.filter((event) => event.status === "draft");

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">運営ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-600">イベント作成と公開状況の管理</p>
        </div>
        <Link
          href="/organizer/events/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          新規イベント作成
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">総イベント数</p>
          <p className="text-2xl font-bold text-gray-900">{events.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">公開中</p>
          <p className="text-2xl font-bold text-gray-900">{publishedEvents.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">下書き</p>
          <p className="text-2xl font-bold text-gray-900">{draftEvents.length}</p>
        </article>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">公開中イベント</h2>
        {publishedEvents.length === 0 ? (
          <p className="text-sm text-gray-600">公開中イベントはありません。</p>
        ) : (
          <div className="space-y-3">
            {publishedEvents.map((event) => (
              <article key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">公開中</div>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-600">📅 {event.eventDate} / 📍 {event.venueName}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/organizer/events/${event.id}`} className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    詳細
                  </Link>
                  <Link href={`/organizer/events/${event.id}/entries`} className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    エントリー
                  </Link>
                  <Link href={`/organizer/events/${event.id}/announcements`} className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    お知らせ
                  </Link>
                  <Link href={`/organizer/events/${event.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    編集
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">下書きイベント</h2>
        {draftEvents.length === 0 ? (
          <p className="text-sm text-gray-600">下書きイベントはありません。</p>
        ) : (
          <div className="space-y-3">
            {draftEvents.map((event) => (
              <article key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">下書き</div>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-600">📅 {event.eventDate} / 📍 {event.venueName}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/organizer/events/${event.id}`} className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    詳細
                  </Link>
                  <Link href={`/organizer/events/${event.id}/entries`} className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    エントリー
                  </Link>
                  <Link href={`/organizer/events/${event.id}/announcements`} className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
                    お知らせ
                  </Link>
                  <Link href={`/organizer/events/${event.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors">
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
