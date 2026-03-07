"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const newBandImageInputRef = useRef<HTMLInputElement>(null);

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
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">出演者ダッシュボード</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">バンド情報とイベントエントリーを管理できます。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4">
          <p className="font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">登録バンド数</p>
          <p className="font-(family-name:--font-bebas-neue) text-3xl tracking-wide text-[#ff2d55] mt-1">{bands.length}</p>
        </article>
        <article className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4">
          <p className="font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">エントリー可能イベント</p>
          <p className="font-(family-name:--font-bebas-neue) text-3xl tracking-wide text-[#f0eff5] mt-1">{events.length}</p>
        </article>
        <article className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4">
          <p className="font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">選択中バンド</p>
          <p className="text-lg font-semibold text-[#f0eff5] mt-1 truncate">{bands.find((b) => b.id === selectedBandId)?.name ?? "未選択"}</p>
        </article>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}
      {success && <div className="border border-[rgba(0,220,120,0.2)] bg-[rgba(0,220,120,0.08)] px-4 py-3 text-sm text-[#00dc78]">{success}</div>}

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 space-y-4">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">バンド登録</h2>
        <form className="space-y-3" onSubmit={handleCreateBand}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="バンド名（必須）"
            className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            required
          />
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="ジャンル（任意）"
            className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="バンド説明（任意）"
            className="w-full min-h-24 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1900}
              max={2999}
              value={formedYear}
              onChange={(e) => setFormedYear(e.target.value)}
              placeholder="結成年（任意）"
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
            <input
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="X/Twitter URL（任意）"
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={newBandImageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setNewBandImage(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => newBandImageInputRef.current?.click()}
              className="inline-flex items-center gap-2 border border-[rgba(255,255,255,0.12)] px-4 py-2 text-sm font-(family-name:--font-space-mono) tracking-[1px] text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6b6a75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              バンド画像を選択
            </button>
            <span className="max-w-45 truncate text-sm text-[#6b6a75]">
              {newBandImage ? newBandImage.name : "ファイル未選択"}
            </span>
          </div>
          <textarea
            value={memberDraft}
            onChange={(e) => setMemberDraft(e.target.value)}
            placeholder="メンバー（任意）: 1行1人、名前,担当 で入力&#10;例: 山田太郎,Vocal"
            className="w-full min-h-24 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
          />
          <textarea
            value={setlistDraft}
            onChange={(e) => setSetlistDraft(e.target.value)}
            placeholder="セットリスト（任意）: 1行1曲、曲名,アーティスト で入力"
            className="w-full min-h-24 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
          />
          <button
            type="submit"
            disabled={isSavingBand}
            className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-3 px-6 transition-colors"
          >
            {isSavingBand ? "作成中..." : "バンドを作成"}
          </button>
        </form>
      </section>

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 space-y-4">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">エントリー申請</h2>
        {bands.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBandId}
              onChange={(e) => setSelectedBandId(e.target.value)}
              className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
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
                className="border border-[rgba(255,255,255,0.12)] px-3 py-2 text-sm font-(family-name:--font-space-mono) tracking-[1px] text-[#6b6a75] hover:text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] transition-colors"
              >
                選択中バンドを編集
              </Link>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#6b6a75]">先にバンドを作成してください。</p>
        )}

        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.id} className="border border-[rgba(255,255,255,0.08)] p-4 hover:border-[rgba(255,255,255,0.12)] transition-colors">
              <h3 className="text-base font-semibold text-[#f0eff5]">{event.title}</h3>
              <p className="mt-1 text-sm text-[#6b6a75]">📅 {event.eventDate} / 📍 {event.venueName}</p>
              {bandEntries.some((entry) => entry.eventId === event.id) && (
                <p className="mt-2 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ff2d55]">このバンドは既に申請済みです。</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEntryModal(event.id)}
                  disabled={bands.length === 0 || entryEventId === event.id || bandEntries.some((entry) => entry.eventId === event.id)}
                  className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
                >
                  {entryEventId === event.id ? "申請中..." : bandEntries.some((entry) => entry.eventId === event.id) ? "申請済み" : "このイベントに申請"}
                </button>
                <Link
                  href={`/events/${event.id}`}
                  className="border border-[rgba(255,255,255,0.12)] px-4 py-2 text-sm font-(family-name:--font-space-mono) tracking-[1px] text-[#6b6a75] hover:text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] transition-colors"
                >
                  詳細
                </Link>
              </div>
            </article>
          ))}
          {events.length === 0 && <p className="text-sm text-[#6b6a75]">公開中イベントがありません。</p>}
        </div>
      </section>

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">申請済みエントリー</h2>
          <select
            value={entryStatusFilter}
            onChange={(e) => setEntryStatusFilter(e.target.value as "" | "pending" | "approved" | "rejected")}
            className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
          >
            <option value="">全件</option>
            <option value="pending">申請中</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
          </select>
        </div>

        <div className="space-y-3">
          {bandEntries.map((entry) => (
            <article key={entry.id} className="border border-[rgba(255,255,255,0.08)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#f0eff5]">{entry.eventTitle}</h3>
                  <p className="mt-1 text-sm text-[#6b6a75]">📅 {entry.eventDate} / 📍 {entry.venueName}</p>
                  <p className="mt-1 font-(family-name:--font-space-mono) text-[10px] text-[#6b6a75]">申請日時: {new Date(entry.createdAt).toLocaleString("ja-JP")}</p>
                </div>
                <span
                  className={
                    entry.status === "pending"
                      ? "inline-flex bg-[rgba(255,170,0,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ffaa00]"
                      : entry.status === "approved"
                        ? "inline-flex bg-[rgba(0,220,120,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#00dc78]"
                        : "inline-flex bg-[rgba(255,45,85,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ff2d55]"
                  }
                >
                  {entry.status === "pending" ? "申請中" : entry.status === "approved" ? "承認済み" : "却下"}
                </span>
              </div>
              {entry.message && <p className="mt-2 text-sm text-[#6b6a75]">メッセージ: {entry.message}</p>}
              {entry.rejectionReason && <p className="mt-2 text-sm text-[#ff5470]">却下理由: {entry.rejectionReason}</p>}
            </article>
          ))}
          {bandEntries.length === 0 && <p className="text-sm text-[#6b6a75]">申請済みエントリーはありません。</p>}
        </div>
      </section>

      {entryModalEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseEntryModal}>
          <div className="w-full max-w-md border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-wider text-[#f0eff5]">エントリー申請</h2>
            <p className="mt-1 text-sm text-[#6b6a75]">申請時に送るメッセージを入力できます（任意）。</p>

            <div className="mt-4">
              <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">申請メッセージ</label>
              <textarea
                value={entryMessage}
                onChange={(e) => setEntryMessage(e.target.value)}
                className="w-full min-h-24 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseEntryModal}
                className="border border-[rgba(255,255,255,0.12)] px-4 py-2 font-(family-name:--font-space-mono) text-xs tracking-[1px] text-[#6b6a75] hover:text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleEntry}
                disabled={entryEventId === entryModalEventId}
                className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] px-6 py-2 transition-colors"
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
