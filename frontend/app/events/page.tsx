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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">イベント一覧</h1>
        <p className="mt-1 text-sm text-gray-600">開催予定のライブイベントをチェック</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="イベント名・会場名・説明で検索"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            検索
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-gray-700">{events.length}件のイベントが見つかりました</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-bold text-gray-900">{event.title}</h2>
            <div className="mt-2 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
              予約受付中
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">{event.description}</p>
            <div className="mt-3 space-y-1 text-sm text-gray-700">
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
