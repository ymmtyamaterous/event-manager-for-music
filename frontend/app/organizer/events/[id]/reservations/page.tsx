"use client";

import { useEffect, useState } from "react";
import { downloadEventReservationsCsv, listEventReservations } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { OrganizerReservation } from "@/types";

type OrganizerReservationsPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerReservationsPage({ params }: OrganizerReservationsPageProps) {
  const { accessToken, user } = useAuth();
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
  }, [eventId, accessToken, user, status, searchWord]);

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
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">予約者一覧</h1>
          <p className="mt-1 text-sm text-gray-600">イベント予約者を検索・管理できます。</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isExporting ? "出力中..." : "CSV出力"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="予約番号・表示名・メールで検索"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "reserved" | "cancelled")}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全件</option>
          <option value="reserved">予約中</option>
          <option value="cancelled">キャンセル済み</option>
        </select>
      </div>

      <p className="text-sm font-medium text-gray-700">{items.length}件</p>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700">
              <th className="px-4 py-3 font-semibold">予約番号</th>
              <th className="px-4 py-3 font-semibold">予約者名</th>
              <th className="px-4 py-3 font-semibold">メールアドレス</th>
              <th className="px-4 py-3 font-semibold">ステータス</th>
              <th className="px-4 py-3 font-semibold">予約日時</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-900">{item.reservationNumber}</td>
                <td className="px-4 py-3 text-gray-900">{item.userDisplayName}</td>
                <td className="px-4 py-3 text-gray-700">{item.userEmail}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      item.status === "reserved"
                        ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"
                        : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
                    }
                  >
                    {item.status === "reserved" ? "予約中" : "キャンセル済み"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{new Date(item.reservedAt).toLocaleString("ja-JP")}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
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
