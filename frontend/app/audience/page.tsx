"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APIUser, cancelReservation, listMyReservations } from "@/lib/api";
import { Reservation } from "@/types";

export default function AudiencePage() {
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [cancelledReservations, setCancelledReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancellingId, setIsCancellingId] = useState<string>("");

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
    const load = async () => {
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
  }, [accessToken, user?.user_type]);

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
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
        <p className="mt-1 text-sm text-gray-600">ようこそ、{user?.display_name ?? "ゲスト"}さん</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">予約中</p>
          <p className="text-2xl font-bold text-gray-900">{activeReservations.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">キャンセル済み</p>
          <p className="text-2xl font-bold text-gray-900">{cancelledReservations.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">参加済み</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </article>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">予約中のイベント</h2>
          <Link href="/events" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            イベント一覧を見る
          </Link>
        </div>

        {activeReservations.length === 0 ? (
          <p className="text-sm text-gray-600">予約中のイベントはありません。</p>
        ) : (
          <div className="space-y-3">
            {activeReservations.map((reservation) => (
              <article key={reservation.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="mb-2 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                  予約済み
                </div>
                <p className="text-sm text-gray-600">予約番号: {reservation.reservationNumber}</p>
                <p className="text-sm text-gray-600">予約日時: {new Date(reservation.reservedAt).toLocaleString("ja-JP")}</p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleCancel(reservation.id)}
                    disabled={isCancellingId === reservation.id}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
        <h2 className="text-xl font-bold text-gray-900">キャンセル済み</h2>
        {cancelledReservations.length === 0 ? (
          <p className="text-sm text-gray-600">キャンセル済みの予約はありません。</p>
        ) : (
          <div className="space-y-3">
            {cancelledReservations.map((reservation) => (
              <article key={reservation.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="mb-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  キャンセル済み
                </div>
                <p className="text-sm text-gray-600">予約番号: {reservation.reservationNumber}</p>
                <p className="text-sm text-gray-600">
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
