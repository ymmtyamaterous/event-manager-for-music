"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createBand,
  createEntry,
  createSetlist,
  listBandEntries,
  listEvents,
  listMyBands,
  replaceBandMembers,
  updateBand,
  uploadBandProfileImage,
} from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { Band, BandEntry, EventCard } from "@/types";

export default function PerformerPage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [formedYear, setFormedYear] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [newBandImage, setNewBandImage] = useState<File | null>(null);
  const [memberDraft, setMemberDraft] = useState("");
  const [setlistDraft, setSetlistDraft] = useState("");
  const [selectedBandId, setSelectedBandId] = useState("");
  const [bandEntries, setBandEntries] = useState<BandEntry[]>([]);
  const [entryStatusFilter, setEntryStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBand, setIsSavingBand] = useState(false);
  const [entryEventId, setEntryEventId] = useState<string | null>(null);
  const [entryModalEventId, setEntryModalEventId] = useState<string | null>(null);
  const [entryMessage, setEntryMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { accessToken, user, isReady } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!isReady) return;
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
  }, [isReady, user, accessToken]);

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

      if (formedYear.trim() || twitterUrl.trim()) {
        await updateBand(created.id, accessToken, {
          formedYear: formedYear.trim() ? Number(formedYear) : undefined,
          twitterUrl: twitterUrl.trim() || undefined,
        });
      }

      const parsedMembers = memberDraft
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [namePart, rolePart] = line.split(",");
          return {
            name: (namePart ?? "").trim(),
            part: (rolePart ?? "").trim(),
            displayOrder: index + 1,
          };
        })
        .filter((item) => item.name && item.part);
      if (parsedMembers.length > 0) {
        await replaceBandMembers(created.id, accessToken, parsedMembers);
      }

      const parsedSetlists = setlistDraft
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [titlePart, artistPart] = line.split(",");
          return {
            title: (titlePart ?? "").trim(),
            artist: (artistPart ?? "").trim() || undefined,
            displayOrder: index + 1,
          };
        })
        .filter((item) => item.title);
      for (const item of parsedSetlists) {
        await createSetlist(created.id, accessToken, item);
      }

      if (newBandImage) {
        await uploadBandProfileImage(created.id, accessToken, newBandImage);
      }

      const refreshedBands = await listMyBands(accessToken);
      setBands(refreshedBands ?? []);
      setSelectedBandId(created.id);
      setName("");
      setGenre("");
      setDescription("");
      setFormedYear("");
      setTwitterUrl("");
      setNewBandImage(null);
      setMemberDraft("");
      setSetlistDraft("");
      setSuccess("バンドを作成しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "バンド作成に失敗しました");
    } finally {
      setIsSavingBand(false);
    }
  };

  const handleOpenEntryModal = (eventId: string) => {
    setEntryModalEventId(eventId);
    setEntryMessage("");
    setError("");
    setSuccess("");
  };

  const handleCloseEntryModal = () => {
    setEntryModalEventId(null);
  };

  const handleEntry = async () => {
    if (!accessToken || !selectedBandId) {
      setError("先にバンドを作成して選択してください");
      return;
    }
    if (!entryModalEventId) {
      return;
    }
    const message = entryMessage.trim();

    setError("");
    setSuccess("");
    setEntryEventId(entryModalEventId);
    try {
      await createEntry(entryModalEventId, accessToken, selectedBandId, message);
      const rows = await listBandEntries(selectedBandId, accessToken, entryStatusFilter || undefined);
      setBandEntries(rows ?? []);
      setSuccess("エントリー申請を送信しました");
      setEntryModalEventId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エントリー申請に失敗しました");
    } finally {
      setEntryEventId(null);
    }
  };

  if (!isReady || !user || user.user_type !== "performer") {
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1900}
              max={2999}
              value={formedYear}
              onChange={(e) => setFormedYear(e.target.value)}
              placeholder="結成年（任意）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="X/Twitter URL（任意）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewBandImage(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-700"
          />
          <textarea
            value={memberDraft}
            onChange={(e) => setMemberDraft(e.target.value)}
            placeholder="メンバー（任意）: 1行1人、名前,担当 で入力\n例: 山田太郎,Vocal"
            className="w-full min-h-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={setlistDraft}
            onChange={(e) => setSetlistDraft(e.target.value)}
            placeholder="セットリスト（任意）: 1行1曲、曲名,アーティスト で入力"
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
          <div className="flex flex-wrap items-center gap-2">
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
            {selectedBandId && (
              <Link
                href={`/performer/bands/${selectedBandId}`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                選択中バンドを編集
              </Link>
            )}
          </div>
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
                  onClick={() => handleOpenEntryModal(event.id)}
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

      {entryModalEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseEntryModal}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">エントリー申請</h2>
            <p className="mt-1 text-sm text-gray-600">申請時に送るメッセージを入力できます（任意）。</p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-gray-700">申請メッセージ</label>
              <textarea
                value={entryMessage}
                onChange={(e) => setEntryMessage(e.target.value)}
                className="w-full min-h-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseEntryModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleEntry}
                disabled={entryEventId === entryModalEventId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {entryEventId === entryModalEventId ? "申請中..." : "申請する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
