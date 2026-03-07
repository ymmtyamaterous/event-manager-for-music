"use client";

import { useCallback, useEffect, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { deleteEventPerformance, listEventPerformances, updateEventPerformance } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { EventPerformance } from "@/types";

type OrganizerPerformancesPageProps = {
  params: Promise<{ id: string }>;
};

export default function OrganizerPerformancesPage({ params }: OrganizerPerformancesPageProps) {
  const { accessToken, user, isReady } = useAuth();
  const [eventId, setEventId] = useState("");
  const [items, setItems] = useState<EventPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState<EventPerformance | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editPerformanceOrder, setEditPerformanceOrder] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventPerformance | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

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
      if (!isReady) return;
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
  }, [eventId, isReady, user, accessToken, reload]);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousItems = items;
    const previousOrderMap = new Map(previousItems.map((item) => [item.id, item.performanceOrder]));

    const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      performanceOrder: index + 1,
    }));

    setItems(reorderedItems);

    if (!accessToken || !eventId) {
      setItems(previousItems);
      return;
    }

    setError("");
    setIsReordering(true);
    try {
      for (const item of reorderedItems) {
        const previousOrder = previousOrderMap.get(item.id);
        if (previousOrder === item.performanceOrder) {
          continue;
        }

        await updateEventPerformance(eventId, item.id, accessToken, {
          performanceOrder: item.performanceOrder,
        });
      }
      await reload();
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "並び替えの保存に失敗しました");
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">出演タイムテーブル管理</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">出演順・開始/終了時刻を編集できます。カードをドラッグして並び替えできます。</p>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}

      <div className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortablePerformanceCard
                key={item.id}
                item={item}
                disabled={isReordering || processingId === item.id}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
              />
            ))}
          </SortableContext>
        </DndContext>

        {items.length === 0 && (
          <div className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">出演情報がありません。</div>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6 w-full max-w-md mx-4">
            <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-wider text-[#f0eff5]">出演情報を編集</h2>
            <p className="mt-1 text-sm text-[#6b6a75]">{editTarget.bandName}</p>

            <form className="mt-4 space-y-3" onSubmit={handleEditSubmit}>
              <div>
                <label htmlFor="start-time" className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">
                  開始時刻（任意）
                </label>
                <input
                  id="start-time"
                  type="text"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  placeholder="18:30"
                  className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="end-time" className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">
                  終了時刻（任意）
                </label>
                <input
                  id="end-time"
                  type="text"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  placeholder="19:00"
                  className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="performance-order" className="mb-1.5 block font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75] uppercase">
                  出演順（必須）
                </label>
                <input
                  id="performance-order"
                  type="number"
                  min={1}
                  value={editPerformanceOrder}
                  onChange={(e) => setEditPerformanceOrder(e.target.value)}
                  className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors"
                  required
                />
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={processingId === editTarget.id}
                  className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2 px-6 transition-colors"
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
          <div className="border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6 w-full max-w-md mx-4">
            <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-wider text-[#f0eff5]">出演情報を削除しますか？</h2>
            <p className="mt-2 text-sm text-[#6b6a75]">
              {deleteTarget.performanceOrder}. {deleteTarget.bandName}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={processingId === deleteTarget.id}
                className="border border-[rgba(255,45,85,0.4)] hover:border-[#ff2d55] disabled:opacity-60 text-[#ff5470] hover:text-[#ff2d55] font-(family-name:--font-space-mono) text-xs tracking-[1px] py-2 px-4 transition-colors"
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

type SortablePerformanceCardProps = {
  item: EventPerformance;
  disabled: boolean;
  onEdit: (item: EventPerformance) => void;
  onDelete: (item: EventPerformance) => void;
};

function SortablePerformanceCard({ item, disabled, onEdit, onDelete }: SortablePerformanceCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-4 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled}
            className="mt-1 cursor-grab border border-[rgba(255,255,255,0.12)] px-2 py-1 font-(family-name:--font-space-mono) text-xs text-[#6b6a75] active:cursor-grabbing disabled:opacity-40"
            aria-label="ドラッグして並び替え"
          >
            ⠿
          </button>
          <div>
            <h2 className="text-base font-semibold text-[#f0eff5]">
              {item.performanceOrder}. {item.bandName}
            </h2>
            <p className="mt-1 font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">
              {item.startTime ?? "--:--"} - {item.endTime ?? "--:--"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            disabled={disabled}
            className="border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] px-4 py-2 transition-colors disabled:opacity-40"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={disabled}
            className="border border-[rgba(255,45,85,0.3)] hover:border-[#ff2d55] text-[#ff5470] hover:text-[#ff2d55] font-(family-name:--font-space-mono) text-[10px] tracking-[1px] px-4 py-2 transition-colors disabled:opacity-40"
          >
            削除
          </button>
        </div>
      </div>
    </article>
  );
}
