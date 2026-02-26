"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEventAnnouncement,
  deleteEventAnnouncement,
  listEventAnnouncements,
  updateEventAnnouncement,
} from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { Announcement } from "@/types";

type OrganizerAnnouncementsPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerAnnouncementsPage({ params }: OrganizerAnnouncementsPageProps) {
  const { accessToken, user } = useAuth();
  const [eventId, setEventId] = useState("");
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
    const announcements = await listEventAnnouncements(eventId);
    setItems(announcements ?? []);
  }, [eventId]);

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
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "お知らせ一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, accessToken, user, reload]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventId || !accessToken) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      setError("タイトルと本文は必須です");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateEventAnnouncement(eventId, editingId, accessToken, {
          title: trimmedTitle,
          content: trimmedContent,
        });
      } else {
        await createEventAnnouncement(eventId, accessToken, {
          title: trimmedTitle,
          content: trimmedContent,
        });
      }
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: Announcement) => {
    setTitle(item.title);
    setContent(item.content);
    setEditingId(item.id);
  };

  const handleDelete = async (announcementId: string) => {
    if (!eventId || !accessToken) {
      return;
    }
    if (!window.confirm("このお知らせを削除しますか？")) {
      return;
    }

    setError("");
    setDeletingId(announcementId);
    try {
      await deleteEventAnnouncement(eventId, announcementId, accessToken);
      await reload();
      if (editingId === announcementId) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">お知らせ管理</h1>
        <p className="mt-1 text-sm text-gray-600">イベント参加者向けのお知らせを作成・編集できます。</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">{editingId ? "お知らせ編集" : "新規お知らせ"}</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="お知らせタイトル"
              maxLength={255}
              required
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              本文
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-28 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="参加者へ伝えたい内容"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isSubmitting ? "保存中..." : editingId ? "更新する" : "作成する"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                編集をキャンセル
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">登録済みお知らせ</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">公開日時: {new Date(item.publishedAt).toLocaleString("ja-JP")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    {deletingId === item.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{item.content}</p>
            </article>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">お知らせはまだありません。</p>}
        </div>
      </section>
    </div>
  );
}
