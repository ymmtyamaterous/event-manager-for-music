"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { APIUser } from "@/lib/api";

export default function PerformerPage() {
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
    if (typeof window === "undefined") {
      return;
    }

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (user.user_type !== "performer") {
      window.location.href = "/";
    }
  }, [user]);

  if (!user || user.user_type !== "performer") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">出演者ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-600">バンド情報とイベントエントリーを管理できます。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">登録バンド数</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">出演予定</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">申請中</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </article>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">次のステップ</h2>
        <p className="mt-2 text-sm text-gray-600">現在は初期実装です。次フェーズでバンド登録・エントリー申請機能を追加します。</p>
        <div className="mt-4">
          <Link href="/events" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            イベント一覧を見る
          </Link>
        </div>
      </section>
    </div>
  );
}
