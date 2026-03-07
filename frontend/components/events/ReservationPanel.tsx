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
    return <p className="text-sm text-[#6b6a75]">読み込み中...</p>;
  }

  if (!accessToken || !user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#6b6a75]">予約にはログインが必要です。</p>
        <Link
          href="/login"
          className="block w-full text-center bg-[#ff2d55] hover:bg-[#ff5470] text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-3 px-4 transition-all hover:shadow-[0_16px_40px_rgba(255,45,85,0.35)]"
        >
          ログインして予約
        </Link>
      </div>
    );
  }

  if (user.user_type !== "audience") {
    return <p className="text-sm text-[#6b6a75]">観客ユーザーとしてログインしてください。</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}
      <button
        type="button"
        onClick={handleReserve}
        disabled={isSubmitting}
        className="block w-full text-center bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-50 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-3 px-4 transition-all hover:shadow-[0_16px_40px_rgba(255,45,85,0.35)]"
      >
        {isSubmitting ? "予約中..." : "予約する"}
      </button>
    </div>
  );
}
