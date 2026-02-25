"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APIUser, createBand, createEntry, listBandEntries, listEvents, listMyBands } from "@/lib/api";
import { Band, BandEntry, EventCard } from "@/types";

export default function PerformerPage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBandId, setSelectedBandId] = useState("");
  const [bandEntries, setBandEntries] = useState<BandEntry[]>([]);
  const [entryStatusFilter, setEntryStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBand, setIsSavingBand] = useState(false);
  const [entryEventId, setEntryEventId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    const load = async () => {
      if (typeof window === "undefined") {
        return;
      }

      if (!user || !accessToken) {
        window.location.href = "/login";
        return;
      }

      if (user.user_type !== "performer") {
        window.location.href = "/";
        return;
      }

      setError("");
      setSuccess("");
      setIsLoading(true);
      try {
        const [myBands, publishedEvents] = await Promise.all([listMyBands(accessToken), listEvents("")]);
        setBands(myBands ?? []);
        setEvents(publishedEvents ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "データ取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [user, accessToken]);

  useEffect(() => {
    if (!selectedBandId && bands.length > 0) {
      setSelectedBandId(bands[0].id);
    }
  }, [bands, selectedBandId]);

  useEffect(() => {
    const loadEntries = async () => {
      if (!accessToken || !selectedBandId) {
        setBandEntries([]);
        return;
      }
      try {
        const rows = await listBandEntries(selectedBandId, accessToken, entryStatusFilter || undefined);
        setBandEntries(rows ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "申請済み一覧の取得に失敗しました");
      }
    };

    void loadEntries();
  }, [accessToken, selectedBandId, entryStatusFilter]);

  const handleCreateBand = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken) {
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("バンド名は必須です");
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingBand(true);
    try {
      const created = await createBand(accessToken, {
        name: trimmedName,
        genre: genre.trim() || undefined,
        description: description.trim() || undefined,
      });
      setBands((prev) => [created, ...prev]);
      setSelectedBandId(created.id);
      setName("");
      setGenre("");
      setDescription("");
      setSuccess("バンドを作成しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "バンド作成に失敗しました");
    } finally {
      setIsSavingBand(false);
    }
  };

  const handleEntry = async (eventId: string) => {
    if (!accessToken || !selectedBandId) {
      setError("先にバンドを作成して選択してください");
      return;
    }
    const message = window.prompt("エントリー時に送るメッセージ（任意）", "") ?? "";

    setError("");
    setSuccess("");
    setEntryEventId(eventId);
    try {
      await createEntry(eventId, accessToken, selectedBandId, message);
      const rows = await listBandEntries(selectedBandId, accessToken, entryStatusFilter || undefined);
      setBandEntries(rows ?? []);
      setSuccess("エントリー申請を送信しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エントリー申請に失敗しました");
    } finally {
      setEntryEventId(null);
    }
  };

  if (!user || user.user_type !== "performer") {
    return null;
  }

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">出演者ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-600">バンド情報とイベントエントリーを管理できます。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">登録バンド数</p>
          <p className="text-2xl font-bold text-gray-900">{bands.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">エントリー可能イベント</p>
          <p className="text-2xl font-bold text-gray-900">{events.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">選択中バンド</p>
          <p className="text-xl font-bold text-gray-900 truncate">{bands.find((b) => b.id === selectedBandId)?.name ?? "未選択"}</p>
        </article>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm">{success}</div>}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">バンド登録</h2>
        <form className="space-y-3" onSubmit={handleCreateBand}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="バンド名（必須）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="ジャンル（任意）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="バンド説明（任意）"
            className="w-full min-h-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSavingBand}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {isSavingBand ? "作成中..." : "バンドを作成"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">エントリー申請</h2>
        {bands.length > 0 ? (
          <select
            value={selectedBandId}
            onChange={(e) => setSelectedBandId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-gray-600">先にバンドを作成してください。</p>
        )}

        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-base font-bold text-gray-900">{event.title}</h3>
              <p className="mt-1 text-sm text-gray-600">📅 {event.eventDate} / 📍 {event.venueName}</p>
              {bandEntries.some((entry) => entry.eventId === event.id) && (
                <p className="mt-2 text-xs text-blue-700">このバンドは既に申請済みです。</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEntry(event.id)}
                  disabled={bands.length === 0 || entryEventId === event.id || bandEntries.some((entry) => entry.eventId === event.id)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {entryEventId === event.id ? "申請中..." : bandEntries.some((entry) => entry.eventId === event.id) ? "申請済み" : "このイベントに申請"}
                </button>
                <Link
                  href={`/events/${event.id}`}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  詳細
                </Link>
              </div>
            </article>
          ))}
          {events.length === 0 && <p className="text-sm text-gray-500">公開中イベントがありません。</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">申請済みエントリー</h2>
          <select
            value={entryStatusFilter}
            onChange={(e) => setEntryStatusFilter(e.target.value as "" | "pending" | "approved" | "rejected")}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全件</option>
            <option value="pending">申請中</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
          </select>
        </div>

        <div className="space-y-3">
          {bandEntries.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{entry.eventTitle}</h3>
                  <p className="mt-1 text-sm text-gray-600">📅 {entry.eventDate} / 📍 {entry.venueName}</p>
                  <p className="mt-1 text-xs text-gray-500">申請日時: {new Date(entry.createdAt).toLocaleString("ja-JP")}</p>
                </div>
                <span
                  className={
                    entry.status === "pending"
                      ? "inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800"
                      : entry.status === "approved"
                        ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"
                        : "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                  }
                >
                  {entry.status === "pending" ? "申請中" : entry.status === "approved" ? "承認済み" : "却下"}
                </span>
              </div>
              {entry.message && <p className="mt-2 text-sm text-gray-700">メッセージ: {entry.message}</p>}
              {entry.rejectionReason && <p className="mt-2 text-sm text-red-700">却下理由: {entry.rejectionReason}</p>}
            </article>
          ))}
          {bandEntries.length === 0 && <p className="text-sm text-gray-500">申請済みエントリーはありません。</p>}
        </div>
      </section>
    </div>
  );
}
