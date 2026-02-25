import Link from "next/link";
import { notFound } from "next/navigation";
import { featuredEvents } from "@/lib/mock-data";
import { getEvent } from "@/lib/api";
import { EventCard } from "@/types";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  let event: EventCard | undefined;

  try {
    event = await getEvent(id);
  } catch {
    event = featuredEvents.find((item) => item.id === id);
  }

  if (!event) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="mt-3 text-sm leading-7 text-gray-700">{event.description}</p>
          <div className="mt-4 space-y-1 text-sm text-gray-700">
            <p>📅 開催日: {event.eventDate}</p>
            <p>📍 会場: {event.venueName}</p>
            <p>🎫 料金: {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
            <p>👥 定員: {event.capacity ?? "未定"}名</p>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900">タイムテーブル</h2>
          <p className="mt-2 text-sm text-gray-600">初期実装段階のため、今後 API 連携で表示します。</p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900">お知らせ</h2>
          <p className="mt-2 text-sm text-gray-600">お知らせデータは今後実装予定です。</p>
        </section>
      </div>

      <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
        <h2 className="text-lg font-bold text-gray-900">予約</h2>
        <p className="mt-2 text-sm text-gray-600">予約にはログインが必要です。</p>
        <div className="mt-4 space-y-2">
          <Link
            href="/login"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ログインして予約
          </Link>
          <Link
            href="/events"
            className="block w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            一覧へ戻る
          </Link>
        </div>
      </aside>
    </div>
  );
}
