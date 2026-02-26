"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listEvents } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { EventCard } from "@/types";

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const rows = await listEvents("");
        if (isActive) {
          setEvents((rows ?? []).slice(0, 3));
        }
      } catch (err) {
        if (isActive) {
          setEvents([]);
          setError(err instanceof Error ? err.message : "イベント取得に失敗しました");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="space-y-12 py-8">
      <section className="rounded-2xl bg-linear-to-br from-blue-600 to-purple-700 px-6 py-14 text-white md:px-12">
        <h1 className="text-3xl font-bold md:text-5xl">ライブイベントを、もっと身近に。</h1>
        <p className="mt-4 max-w-2xl text-blue-50">
          EventManager は、ライブイベントの検索・予約・出演管理を一つにまとめたプラットフォームです。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/events"
            className="bg-blue-100 px-5 py-2.5 font-semibold text-blue-900 rounded-lg hover:bg-white transition-colors"
          >
            イベントを探す
          </Link>
          {!user && (
            <Link
              href="/register"
              className="border border-white/70 px-5 py-2.5 font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              新規登録
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: "簡単予約",
            body: "気になるイベントはワンクリックで予約。マイページで予約状況もすぐ確認できます。",
          },
          {
            title: "バンド情報",
            body: "出演バンドのプロフィールやSNSをまとめてチェック。初めてのバンドにも出会えます。",
          },
          {
            title: "会場案内",
            body: "会場情報やタイムテーブル、お知らせを事前に確認して当日を安心して迎えられます。",
          },
        ].map((feature) => (
          <article key={feature.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900">{feature.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{feature.body}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-gray-900">開催予定イベント</h2>
          <Link href="/events" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            すべて見る
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-600">読み込み中...</p>
        ) : error ? (
          <p className="text-sm text-red-600">イベントの取得に失敗しました。</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-600">現在公開中のイベントはありません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="mb-2 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                  予約受付中
                </div>
                <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{event.description}</p>
                <div className="mt-3 text-sm text-gray-700">
                  <p>📅 {event.eventDate}</p>
                  <p>📍 {event.venueName}</p>
                  <p>🎫 {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
