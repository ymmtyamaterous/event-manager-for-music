"use client";

import Link from "next/link";
import { useState } from "react";
import { createReservation } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type ReservationPanelProps = {
  eventId: string;
};

export function ReservationPanel({ eventId }: ReservationPanelProps) {
  const { accessToken, user, isReady } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleReserve = async () => {
    if (!accessToken) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await createReservation(eventId, accessToken);
      window.location.href = "/audience";
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約に失敗しました");
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return <p className="text-sm text-gray-400">読み込み中...</p>;
  }

  if (!accessToken || !user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">予約にはログインが必要です。</p>
        <Link
          href="/login"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ログインして予約
        </Link>
      </div>
    );
  }

  if (user.user_type !== "audience") {
    return <p className="text-sm text-gray-600">観客ユーザーとしてログインしてください。</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <button
        type="button"
        onClick={handleReserve}
        disabled={isSubmitting}
        className="block w-full text-center bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        {isSubmitting ? "予約中..." : "予約する"}
      </button>
    </div>
  );
}
