"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cancelReservation, listMyReservations } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { Reservation } from "@/types";

export default function AudiencePage() {
  const { accessToken, user, isReady } = useAuth();
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [cancelledReservations, setCancelledReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancellingId, setIsCancellingId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!isReady) return;
      if (!accessToken) {
        window.location.href = "/login";
        return;
      }
      if (user?.user_type !== "audience") {
        window.location.href = "/";
        return;
      }

      setError("");
      setIsLoading(true);
      try {
        const [active, cancelled] = await Promise.all([
          listMyReservations(accessToken, "reserved"),
          listMyReservations(accessToken, "cancelled"),
        ]);
        setActiveReservations(active ?? []);
        setCancelledReservations(cancelled ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "予約一覧の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [isReady, accessToken, user?.user_type]);

  const handleCancel = async (reservationId: string) => {
    if (!accessToken) {
      return;
    }
    setError("");
    setIsCancellingId(reservationId);
    try {
      await cancelReservation(reservationId, accessToken);
      const [active, cancelled] = await Promise.all([
        listMyReservations(accessToken, "reserved"),
        listMyReservations(accessToken, "cancelled"),
      ]);
      setActiveReservations(active ?? []);
      setCancelledReservations(cancelled ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "キャンセルに失敗しました");
    } finally {
      setIsCancellingId("");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-[#6b6a75]">読み込み中...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] mb-2">— MY PAGE</p>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-tight text-[#f0eff5]">マイページ</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">ようこそ、{user?.display_name ?? "ゲスト"}さん</p>
      </div>

      {error && <div className="border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-px md:grid-cols-3">
        <article className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">予約中</p>
          <p className="mt-1 font-(family-name:--font-bebas-neue) text-4xl text-[#ff2d55]">{activeReservations.length}</p>
        </article>
        <article className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">キャンセル済み</p>
          <p className="mt-1 font-(family-name:--font-bebas-neue) text-4xl text-[#f0eff5]">{cancelledReservations.length}</p>
        </article>
        <article className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
          <p className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75]">参加済み</p>
          <p className="mt-1 font-(family-name:--font-bebas-neue) text-4xl text-[#f0eff5]">0</p>
        </article>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">予約中のイベント</h2>
          <Link href="/events" className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75] hover:text-[#f0eff5] transition-colors">
            イベント一覧を見る
          </Link>
        </div>

        {activeReservations.length === 0 ? (
          <p className="text-sm text-[#6b6a75]">予約中のイベントはありません。</p>
        ) : (
          <div className="space-y-3">
            {activeReservations.map((reservation) => (
              <article key={reservation.id} className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
                <div className="mb-2 inline-flex bg-[rgba(255,45,85,0.15)] px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#ff2d55]">
                  予約済み
                </div>
                <p className="text-sm text-[#6b6a75]">予約番号: {reservation.reservationNumber}</p>
                <p className="text-sm text-[#6b6a75]">予約日時: {new Date(reservation.reservedAt).toLocaleString("ja-JP")}</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleCancel(reservation.id)}
                    disabled={isCancellingId === reservation.id}
                    className="border border-red-500/30 hover:bg-red-900/20 disabled:opacity-50 text-red-400 font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2 px-4 transition-colors"
                  >
                    {isCancellingId === reservation.id ? "キャンセル中..." : "キャンセル"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">キャンセル済み</h2>
        {cancelledReservations.length === 0 ? (
          <p className="text-sm text-[#6b6a75]">キャンセル済みの予約はありません。</p>
        ) : (
          <div className="space-y-3">
            {cancelledReservations.map((reservation) => (
              <article key={reservation.id} className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-5">
                <div className="mb-2 inline-flex bg-white/5 px-2.5 py-1 font-(family-name:--font-space-mono) text-[10px] tracking-[2px] text-[#6b6a75]">
                  キャンセル済み
                </div>
                <p className="text-sm text-[#6b6a75]">予約番号: {reservation.reservationNumber}</p>
                <p className="text-sm text-[#6b6a75]">
                  キャンセル日時: {reservation.cancelledAt ? new Date(reservation.cancelledAt).toLocaleString("ja-JP") : "-"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
