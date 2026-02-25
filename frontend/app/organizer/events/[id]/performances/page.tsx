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

  const handleEdit = async (item: EventPerformance) => {
    if (!accessToken || !eventId) {
      return;
    }

    const startInput = window.prompt("開始時刻（任意 / HH:MM）", item.startTime ?? "");
    if (startInput === null) {
      return;
    }
    const endInput = window.prompt("終了時刻（任意 / HH:MM）", item.endTime ?? "");
    if (endInput === null) {
      return;
    }
    const orderInput = window.prompt("出演順（1以上）", String(item.performanceOrder));
    if (orderInput === null) {
      return;
    }

    const start = startInput.trim();
    const end = endInput.trim();
    const orderText = orderInput.trim();

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
    setProcessingId(item.id);
    try {
      await updateEventPerformance(eventId, item.id, accessToken, {
        startTime: start || undefined,
        endTime: end || undefined,
        performanceOrder: order,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (performanceId: string) => {
    if (!accessToken || !eventId) {
      return;
    }
    if (!window.confirm("この出演情報を削除しますか？")) {
      return;
    }

    setError("");
    setProcessingId(performanceId);
    try {
      await deleteEventPerformance(eventId, performanceId, accessToken);
      await reload();
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
                  onClick={() => handleEdit(item)}
                  disabled={processingId === item.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
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
    </div>
  );
}
