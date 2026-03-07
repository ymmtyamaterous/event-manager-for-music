"use client";

import { useEffect, useMemo, useState } from "react";
import { approveEntry, listEventEntries, rejectEntry } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { EventEntry } from "@/types";

type OrganizerEntriesPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerEntriesPage({ params }: OrganizerEntriesPageProps) {
  const { accessToken, user, isReady } = useAuth();
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "approved" | "rejected">("");
  const [searchWord, setSearchWord] = useState("");
  const [items, setItems] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [approveModalEntryId, setApproveModalEntryId] = useState<string | null>(null);
  const [approveStartTime, setApproveStartTime] = useState("");
  const [approveEndTime, setApproveEndTime] = useState("");
  const [approveOrder, setApproveOrder] = useState("");
  const [rejectModalEntryId, setRejectModalEntryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredItems = useMemo(() => {
    const word = searchWord.trim().toLowerCase();
    if (!word) {
      return items;
    }
    return items.filter((item) => {
      return (
        item.bandName.toLowerCase().includes(word) ||
        (item.message ?? "").toLowerCase().includes(word) ||
        (item.rejectionReason ?? "").toLowerCase().includes(word)
      );
    });
  }, [items, searchWord]);

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
        const entries = await listEventEntries(eventId, accessToken, status || undefined);
        setItems(entries ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エントリー一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, isReady, accessToken, user, status]);

  const reload = async () => {
    if (!eventId || !accessToken) {
      return;
    }
    const entries = await listEventEntries(eventId, accessToken, status || undefined);
    setItems(entries ?? []);
  };

  const handleOpenApproveModal = (entryId: string) => {
    setApproveModalEntryId(entryId);
    setApproveStartTime("");
    setApproveEndTime("");
    setApproveOrder("");
    setError("");
  };

  const handleCloseApproveModal = () => {
    setApproveModalEntryId(null);
  };

  const handleApprove = async () => {
    if (!accessToken) {
      return;
    }

    if (!approveModalEntryId) {
      return;
    }

    const start = approveStartTime.trim();
    const end = approveEndTime.trim();
    const orderRaw = approveOrder.trim();

    if (start && !/^\d{2}:\d{2}$/.test(start)) {
      setError("開始時刻は HH:MM 形式で入力してください");
      return;
    }
    if (end && !/^\d{2}:\d{2}$/.test(end)) {
      setError("終了時刻は HH:MM 形式で入力してください");
      return;
    }

    let performanceOrder: number | undefined;
    if (orderRaw) {
      const parsed = Number(orderRaw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setError("出演順は1以上の整数で入力してください");
        return;
      }
      performanceOrder = parsed;
    }

    setError("");
    setProcessingId(approveModalEntryId);
    try {
      await approveEntry(approveModalEntryId, accessToken, {
        startTime: start || undefined,
        endTime: end || undefined,
        performanceOrder,
      });
      await reload();
      setApproveModalEntryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "承認に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (entryId: string) => {
    setRejectModalEntryId(entryId);
    setRejectReason("");
    setError("");
  };

  const handleCloseRejectModal = () => {
    setRejectModalEntryId(null);
  };

  const handleReject = async () => {
    if (!accessToken) {
      return;
    }
    if (!rejectModalEntryId) {
      return;
    }
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setError("却下理由は必須です");
      return;
    }

    setError("");
    setProcessingId(rejectModalEntryId);
    try {
      await rejectEntry(rejectModalEntryId, accessToken, trimmed);
      await reload();
      setRejectModalEntryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "却下に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const bom = "\uFEFF";
      const header = ["バンド名", "ステータス", "申請メッセージ", "却下理由", "申請日時"];
      const rows = filteredItems.map((item) => [
        item.bandName,
        item.status,
        item.message ?? "",
        item.rejectionReason ?? "",
        new Date(item.createdAt).toLocaleString("ja-JP"),
      ]);

      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entries-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">エントリー申請管理</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">出演申請の承認・却下を行います。</p>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="バンド名・メッセージ・却下理由で検索"
          className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "pending" | "approved" | "rejected")}
          className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
        >
          <option value="">全件</option>
          <option value="pending">未対応</option>
          <option value="approved">承認済み</option>
          <option value="rejected">却下</option>
        </select>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isExporting}
          className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2 px-5 transition-colors"
        >
          {isExporting ? "出力中..." : "CSV出力"}
        </button>
      </div>

      <p className="font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75]">{filteredItems.length}件</p>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <article key={item.id} className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#f0eff5]">{item.bandName}</h2>
                <p className="mt-1 font-(family-name:--font-space-mono) text-[10px] text-[#6b6a75]">申請日時: {new Date(item.createdAt).toLocaleString("ja-JP")}</p>
              </div>
              <span
                className={
                  item.status === "pending"
                    ? "inline-flex bg-[rgba(255,170,0,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ffaa00]"
                    : item.status === "approved"
                      ? "inline-flex bg-[rgba(0,220,120,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#00dc78]"
                      : "inline-flex bg-[rgba(255,45,85,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ff5470]"
                }
              >
                {item.status === "pending" ? "未対応" : item.status === "approved" ? "承認済み" : "却下"}
              </span>
            </div>

            {item.message && <p className="mt-3 whitespace-pre-wrap text-sm text-[#6b6a75]">申請メッセージ: {item.message}</p>}
            {item.rejectionReason && <p className="mt-2 text-sm text-[#ff5470]">却下理由: {item.rejectionReason}</p>}

            {item.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenApproveModal(item.id)}
                  disabled={processingId === item.id}
                  className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
                >
                  承認
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenRejectModal(item.id)}
                  disabled={processingId === item.id}
                  className="border border-[rgba(255,45,85,0.4)] hover:border-[#ff2d55] disabled:opacity-60 text-[#ff5470] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
                >
                  却下
                </button>
              </div>
            )}
          </article>
        ))}

        {filteredItems.length === 0 && (
          <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">エントリー申請はありません。</div>
        )}
      </div>

      {approveModalEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseApproveModal}>
          <div className="w-full max-w-md border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-wider text-[#f0eff5]">エントリー承認</h2>
            <p className="mt-1 text-sm text-[#6b6a75]">開始時刻・終了時刻・出演順を必要に応じて入力してください。</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">開始時刻（任意）</label>
                <input
                  type="time"
                  value={approveStartTime}
                  onChange={(e) => setApproveStartTime(e.target.value)}
                  className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">終了時刻（任意）</label>
                <input
                  type="time"
                  value={approveEndTime}
                  onChange={(e) => setApproveEndTime(e.target.value)}
                  className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">出演順（任意）</label>
                <input
                  type="number"
                  min={1}
                  value={approveOrder}
                  onChange={(e) => setApproveOrder(e.target.value)}
                  className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseApproveModal}
                className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[1px] px-4 py-2 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={processingId === approveModalEntryId}
                className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] px-6 py-2 transition-colors"
              >
                {processingId === approveModalEntryId ? "承認中..." : "承認する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseRejectModal}>
          <div className="w-full max-w-md border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-wider text-[#f0eff5]">エントリー却下</h2>
            <p className="mt-1 text-sm text-[#6b6a75]">却下理由を入力してください。</p>

            <div className="mt-4">
              <label className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">却下理由</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full min-h-24 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseRejectModal}
                className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[1px] px-4 py-2 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={processingId === rejectModalEntryId}
                className="border border-[rgba(255,45,85,0.4)] hover:border-[#ff2d55] disabled:opacity-60 text-[#ff5470] hover:text-[#ff2d55] font-(family-name:--font-space-mono) text-xs tracking-[1px] px-6 py-2 transition-colors"
              >
                {processingId === rejectModalEntryId ? "却下中..." : "却下する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
