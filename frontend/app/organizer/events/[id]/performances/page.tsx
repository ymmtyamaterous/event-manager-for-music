"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APIUser, deleteEventPerformance, listEventPerformances, updateEventPerformance } from "@/lib/api";
import { EventPerformance } from "@/types";

type OrganizerPerformancesPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerPerformancesPage({ params }: OrganizerPerformancesPageProps) {
  const [eventId, setEventId] = useState("");
  const [items, setItems] = useState<EventPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState<EventPerformance | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editPerformanceOrder, setEditPerformanceOrder] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventPerformance | null>(null);

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
    const loadParams = async () => {
      const resolved = await params;
      setEventId(resolved.id);
    };
    void loadParams();
  }, [params]);

  const reload = useCallback(async () => {
    if (!eventId) {
      return;
    }
    const rows = await listEventPerformances(eventId);
    setItems(rows ?? []);
  }, [eventId]);

  useEffect(() => {
    const load = async () => {
      if (!eventId) {
        return;
      }
      if (!user || !accessToken) {
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
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "出演一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, user, accessToken, reload]);

  const openEditModal = (item: EventPerformance) => {
    setEditTarget(item);
    setEditStartTime(item.startTime ?? "");
    setEditEndTime(item.endTime ?? "");
    setEditPerformanceOrder(String(item.performanceOrder));
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken || !eventId || !editTarget) {
      return;
    }

    const start = editStartTime.trim();
    const end = editEndTime.trim();
    const orderText = editPerformanceOrder.trim();

    if (start && !/^\d{2}:\d{2}$/.test(start)) {
      setError("開始時刻は HH:MM 形式で入力してください");
      return;
    }
    if (end && !/^\d{2}:\d{2}$/.test(end)) {
      setError("終了時刻は HH:MM 形式で入力してください");
      return;
    }

    const order = Number(orderText);
    if (!Number.isInteger(order) || order <= 0) {
      setError("出演順は1以上の整数で入力してください");
      return;
    }

    setError("");
    setProcessingId(editTarget.id);
    try {
      await updateEventPerformance(eventId, editTarget.id, accessToken, {
        startTime: start || undefined,
        endTime: end || undefined,
        performanceOrder: order,
      });
      await reload();
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !eventId) {
      return;
    }
    if (!deleteTarget) {
      return;
    }

    setError("");
    setProcessingId(deleteTarget.id);
    try {
      await deleteEventPerformance(eventId, deleteTarget.id, accessToken);
      await reload();
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">出演タイムテーブル管理</h1>
        <p className="mt-1 text-sm text-gray-600">出演順・開始/終了時刻を編集できます。</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {item.performanceOrder}. {item.bandName}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {item.startTime ?? "--:--"} - {item.endTime ?? "--:--"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  disabled={processingId === item.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  disabled={processingId === item.id}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-sm text-gray-500">出演情報がありません。</div>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900">出演情報を編集</h2>
            <p className="mt-1 text-sm text-gray-600">{editTarget.bandName}</p>

            <form className="mt-4 space-y-3" onSubmit={handleEditSubmit}>
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻（任意）
                </label>
                <input
                  id="start-time"
                  type="text"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  placeholder="18:30"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">
                  終了時刻（任意）
                </label>
                <input
                  id="end-time"
                  type="text"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  placeholder="19:00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="performance-order" className="block text-sm font-medium text-gray-700 mb-1">
                  出演順（必須）
                </label>
                <input
                  id="performance-order"
                  type="number"
                  min={1}
                  value={editPerformanceOrder}
                  onChange={(e) => setEditPerformanceOrder(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={processingId === editTarget.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {processingId === editTarget.id ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900">出演情報を削除しますか？</h2>
            <p className="mt-2 text-sm text-gray-600">
              {deleteTarget.performanceOrder}. {deleteTarget.bandName}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={processingId === deleteTarget.id}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {processingId === deleteTarget.id ? "削除中..." : "削除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
