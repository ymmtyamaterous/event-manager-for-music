"use client";

import { useEffect, useState } from "react";
import { downloadEventReservationsCsv, listEventReservations } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { OrganizerReservation } from "@/types";

type OrganizerReservationsPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerReservationsPage({ params }: OrganizerReservationsPageProps) {
  const { accessToken, user, isReady } = useAuth();
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState<"" | "reserved" | "cancelled">("");
  const [searchWord, setSearchWord] = useState("");
  const [items, setItems] = useState<OrganizerReservation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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
        const rows = await listEventReservations(eventId, accessToken, status || undefined, searchWord);
        setItems(rows ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "予約者一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void load();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [eventId, isReady, accessToken, user, status, searchWord]);

  const handleExport = async () => {
    if (!eventId || !accessToken) {
      return;
    }

    setError("");
    setIsExporting(true);
    try {
      const blob = await downloadEventReservationsCsv(eventId, accessToken, status || undefined, searchWord);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reservations-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV出力に失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">予約者一覧</h1>
          <p className="mt-1 text-sm text-[#6b6a75]">イベント予約者を検索・管理できます。</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2.5 px-5 transition-colors"
        >
          {isExporting ? "出力中..." : "CSV出力"}
        </button>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="予約番号・表示名・メールで検索"
          className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "reserved" | "cancelled")}
          className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
        >
          <option value="">全件</option>
          <option value="reserved">予約中</option>
          <option value="cancelled">キャンセル済み</option>
        </select>
      </div>

      <p className="font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75]">{items.length}件</p>

      <div className="overflow-x-auto border border-[rgba(255,255,255,0.08)] bg-[#0d0d12]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[rgba(255,255,255,0.08)]">
              <th className="px-4 py-3 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">予約番号</th>
              <th className="px-4 py-3 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">予約者名</th>
              <th className="px-4 py-3 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">メールアドレス</th>
              <th className="px-4 py-3 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">ステータス</th>
              <th className="px-4 py-3 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">予約日時</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[rgba(255,255,255,0.06)] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-(family-name:--font-space-mono) text-xs text-[#f0eff5]">{item.reservationNumber}</td>
                <td className="px-4 py-3 text-[#f0eff5]">{item.userDisplayName}</td>
                <td className="px-4 py-3 text-[#6b6a75]">{item.userEmail}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      item.status === "reserved"
                        ? "inline-flex bg-[rgba(0,220,120,0.12)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#00dc78]"
                        : "inline-flex bg-[rgba(255,255,255,0.06)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#6b6a75]"
                    }
                  >
                    {item.status === "reserved" ? "予約中" : "キャンセル済み"}
                  </span>
                </td>
                <td className="px-4 py-3 font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">{new Date(item.reservedAt).toLocaleString("ja-JP")}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">
                  予約データがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
