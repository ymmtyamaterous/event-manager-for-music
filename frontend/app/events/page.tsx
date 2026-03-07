"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listEvents } from "@/lib/api";
import { EventCard } from "@/types";

export default function EventsPage() {
  const [searchWord, setSearchWord] = useState("");
  const [eventsFromAPI, setEventsFromAPI] = useState<EventCard[]>([]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const events = await listEvents(searchWord);
        if (isActive) {
          setEventsFromAPI(events);
        }
      } catch {
        if (isActive) {
          setEventsFromAPI([]);
        }
      }
    };

    const id = setTimeout(() => {
      void load();
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(id);
    };
  }, [searchWord]);

  const events = useMemo(() => {
    const keyword = searchWord.trim().toLowerCase();
    if (!keyword) {
      return eventsFromAPI;
    }
    return eventsFromAPI.filter((event) => {
      const target = `${event.title} ${event.venueName} ${event.description}`.toLowerCase();
      return target.includes(keyword);
    });
  }, [eventsFromAPI, searchWord]);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-2">— EVENTS</p>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-tight text-[#f0eff5]">イベント一覧</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">開催予定のライブイベントをチェック</p>
      </div>

      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="イベント名・会場名・説明で検索"
            className="w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors"
          />
          <button
            type="button"
            className="font-(family-name:--font-space-mono) text-xs tracking-[2px] bg-[#ff2d55] hover:bg-[#ff5470] text-white px-6 py-2 transition-colors whitespace-nowrap"
          >
            検索
          </button>
        </div>
      </div>

      <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">{events.length}件のイベントが見つかりました</p>

      <div className="grid grid-cols-1 gap-px md:grid-cols-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group block bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5 transition-all duration-300 hover:border-[rgba(255,255,255,0.15)] hover:-translate-y-0.5"
          >
            <h2 className="text-base font-bold text-[#f0eff5] group-hover:text-[#ff2d55] transition-colors">{event.title}</h2>
            <div className="mt-2 inline-flex bg-[rgba(255,45,85,0.15)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#ff2d55]">
              予約受付中
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[rgba(240,239,245,0.55)]">{event.description}</p>
            <div className="mt-4 space-y-1 text-xs text-[#6b6a75]">
              <p>📅 {event.eventDate}</p>
              <p>📍 {event.venueName}</p>
              <p>🎫 {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
              <p>👥 {event.capacity ?? "未定"}名</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
