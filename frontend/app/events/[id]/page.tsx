import Link from "next/link";
import { notFound } from "next/navigation";
import { featuredEvents } from "@/lib/mock-data";
import { getEvent, listEventAnnouncements } from "@/lib/api";
import { Announcement, EventCard } from "@/types";
import { ReservationPanel } from "@/components/events/ReservationPanel";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  let event: EventCard | undefined;
  let announcements: Announcement[] = [];

  try {
    event = await getEvent(id);
  } catch {
    event = featuredEvents.find((item) => item.id === id);
  }

  if (!event) {
    notFound();
  }

  try {
    announcements = await listEventAnnouncements(event.id);
  } catch {
    announcements = [];
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
          {announcements.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">現在、お知らせはありません。</p>
          ) : (
            <div className="mt-3 space-y-3">
              {announcements.map((item) => (
                <article key={item.id} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{new Date(item.publishedAt).toLocaleString("ja-JP")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{item.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
        <h2 className="text-lg font-bold text-gray-900">予約</h2>
        <div className="mt-4 space-y-2">
          <ReservationPanel eventId={event.id} />
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
