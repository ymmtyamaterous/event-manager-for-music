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

  useEffect(() => {
    const els = document.querySelectorAll<Element>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] px-8 py-16 md:px-16 md:py-24"
        style={{ background: "radial-gradient(ellipse 60% 60% at 70% 50%, rgba(255,45,85,0.10), transparent), radial-gradient(ellipse 40% 80% at 20% 80%, rgba(0,229,255,0.05), transparent), #0d0d12" }}
      >
        {/* 装飾ライン */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* 上辺の赤ライン（左から伸びる） */}
          <div className="absolute inset-x-0 top-0 h-px origin-left animate-[expandX_1.2s_ease_both] bg-linear-to-r from-[#ff2d55] via-[rgba(255,45,85,0.4)] to-transparent" />
          {/* 右縦ライン（上から伸びる） */}
          <div className="absolute right-0 top-0 h-full w-px origin-top animate-[expandY_1.4s_0.3s_ease_both] bg-linear-to-b from-[rgba(255,45,85,0.5)] via-[rgba(255,45,85,0.15)] to-transparent" />
          {/* グロー脈動オーバーレイ */}
          <div
            className="absolute inset-0 animate-[glowPulse_5s_ease-in-out_infinite]"
            style={{ background: "radial-gradient(ellipse 45% 55% at 78% 38%, rgba(255,45,85,0.10), transparent)" }}
          />
        </div>

        <p className="mb-4 font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] animate-[fadeUp_0.6s_ease_both]">
          — LIVE EVENT PLATFORM
        </p>
        <h1 className="font-(family-name:--font-bebas-neue) text-5xl leading-tight tracking-tight text-[#f0eff5] md:text-7xl animate-[fadeUp_0.6s_0.12s_ease_both]">
          ライブイベントを、<br />もっと身近に。
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[rgba(240,239,245,0.65)] animate-[fadeUp_0.6s_0.25s_ease_both]">
          STAGECRAFT は、ライブイベントの検索・予約・出演管理を一つにまとめたプラットフォームです。
        </p>
        <div className="mt-8 flex flex-wrap gap-4 animate-[fadeUp_0.6s_0.4s_ease_both]">
          <Link
            href="/events"
            className="font-(family-name:--font-space-mono) text-xs tracking-[2px] bg-[#ff2d55] px-6 py-3 text-white transition-all hover:bg-[#ff5470] hover:shadow-[0_16px_40px_rgba(255,45,85,0.40)] hover:-translate-y-0.5"
          >
            イベントを探す
          </Link>
          {!user && (
            <Link
              href="/register"
              className="font-(family-name:--font-space-mono) text-xs tracking-[2px] border border-[rgba(255,255,255,0.20)] px-6 py-3 text-[#f0eff5] transition-colors hover:bg-white/5"
            >
              新規登録
            </Link>
          )}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 gap-px md:grid-cols-3">
        {[
          {
            num: "01",
            title: "簡単予約",
            body: "気になるイベントはワンクリックで予約。マイページで予約状況もすぐ確認できます。",
          },
          {
            num: "02",
            title: "バンド情報",
            body: "出演バンドのプロフィールやSNSをまとめてチェック。初めてのバンドにも出会えます。",
          },
          {
            num: "03",
            title: "会場案内",
            body: "会場情報やタイムテーブル、お知らせを事前に確認して当日を安心して迎えられます。",
          },
        ].map((feature, index) => (
          <article
            key={feature.title}
            className="reveal group relative bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,255,255,0.15)]"
            style={{ transitionDelay: `${index * 0.12}s` }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px bg-[#ff2d55] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <p className="font-(family-name:--font-bebas-neue) text-5xl text-white/4">
              {feature.num}
            </p>
            <h2 className="mt-2 text-lg font-bold text-[#f0eff5]">{feature.title}</h2>
            <p className="mt-2 text-sm leading-7 text-[rgba(240,239,245,0.55)]">{feature.body}</p>
          </article>
        ))}
      </section>

      {/* Upcoming Events */}
      <section className="reveal">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-2">— EVENTS</p>
            <h2 className="font-(family-name:--font-bebas-neue) text-4xl tracking-tight text-[#f0eff5]">開催予定イベント</h2>
          </div>
          <Link
            href="/events"
            className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75] transition-colors hover:text-[#f0eff5]"
          >
            すべて見る →
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-[#6b6a75]">読み込み中...</p>
        ) : error ? (
          <p className="text-sm text-red-400">イベントの取得に失敗しました。</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[#6b6a75]">現在公開中のイベントはありません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group block bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5 transition-all duration-300 hover:border-[rgba(255,255,255,0.15)] hover:-translate-y-0.5"
              >
                <div className="mb-3 inline-flex bg-[rgba(255,45,85,0.15)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#ff2d55]">
                  予約受付中
                </div>
                <h3 className="text-base font-bold text-[#f0eff5] group-hover:text-[#ff2d55] transition-colors">{event.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-[rgba(240,239,245,0.55)]">{event.description}</p>
                <div className="mt-4 space-y-1 text-xs text-[#6b6a75]">
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
