"use client";

import { useEffect, useMemo, useState } from "react";
import { APIUser, approveEntry, listEventEntries, rejectEntry } from "@/lib/api";
import { EventEntry } from "@/types";

type OrganizerEntriesPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerEntriesPage({ params }: OrganizerEntriesPageProps) {
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "approved" | "rejected">("");
  const [searchWord, setSearchWord] = useState("");
  const [items, setItems] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
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
  }, [eventId, accessToken, user, status]);

  const reload = async () => {
    if (!eventId || !accessToken) {
      return;
    }
    const entries = await listEventEntries(eventId, accessToken, status || undefined);
    setItems(entries ?? []);
  };

  const handleApprove = async (entryId: string) => {
    if (!accessToken) {
      return;
    }

    setError("");
    setProcessingId(entryId);
    try {
      await approveEntry(entryId, accessToken);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "承認に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (entryId: string) => {
    if (!accessToken) {
      return;
    }
    const reason = window.prompt("却下理由を入力してください");
    if (reason === null) {
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("却下理由は必須です");
      return;
    }

    setError("");
    setProcessingId(entryId);
    try {
      await rejectEntry(entryId, accessToken, trimmed);
      await reload();
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
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">エントリー申請管理</h1>
        <p className="mt-1 text-sm text-gray-600">出演申請の承認・却下を行います。</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="バンド名・メッセージ・却下理由で検索"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "pending" | "approved" | "rejected")}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {isExporting ? "出力中..." : "CSV出力"}
        </button>
      </div>

      <p className="text-sm font-medium text-gray-700">{filteredItems.length}件</p>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <article key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{item.bandName}</h2>
                <p className="mt-1 text-xs text-gray-500">申請日時: {new Date(item.createdAt).toLocaleString("ja-JP")}</p>
              </div>
              <span
                className={
                  item.status === "pending"
                    ? "inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800"
                    : item.status === "approved"
                      ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"
                      : "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                }
              >
                {item.status === "pending" ? "未対応" : item.status === "approved" ? "承認済み" : "却下"}
              </span>
            </div>

            {item.message && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">申請メッセージ: {item.message}</p>}
            {item.rejectionReason && <p className="mt-2 text-sm text-red-700">却下理由: {item.rejectionReason}</p>}

            {item.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(item.id)}
                  disabled={processingId === item.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  承認
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(item.id)}
                  disabled={processingId === item.id}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  却下
                </button>
              </div>
            )}
          </article>
        ))}

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-sm text-gray-500">エントリー申請はありません。</div>
        )}
      </div>
    </div>
  );
}
