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
  const { accessToken, user, isReady } = useAuth();
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
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "お知らせ一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [eventId, isReady, accessToken, user, reload]);

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
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">お知らせ管理</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">イベント参加者向けのお知らせを作成・編集できます。</p>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">{editingId ? "お知らせ編集" : "新規お知らせ"}</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="title" className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">
              タイトル
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              placeholder="お知らせタイトル"
              maxLength={255}
              required
            />
          </div>
          <div>
            <label htmlFor="content" className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">
              本文
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-28 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
              placeholder="参加者へ伝えたい内容"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2.5 px-6 transition-colors"
            >
              {isSubmitting ? "保存中..." : editingId ? "更新する" : "作成する"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2.5 px-5 transition-colors"
              >
                編集をキャンセル
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">登録済みお知らせ</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="border border-[rgba(255,255,255,0.08)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[#f0eff5]">{item.title}</h3>
                  <p className="mt-1 font-(family-name:--font-space-mono) text-[10px] text-[#6b6a75]">公開日時: {new Date(item.publishedAt).toLocaleString("ja-JP")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="border border-[rgba(255,45,85,0.3)] hover:border-[#ff2d55] disabled:opacity-60 text-[#ff5470] hover:text-[#ff2d55] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] py-1.5 px-3 transition-colors"
                  >
                    {deletingId === item.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[#6b6a75]">{item.content}</p>
            </article>
          ))}
          {items.length === 0 && <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">お知らせはまだありません。</p>}
        </div>
      </section>
    </div>
  );
}
