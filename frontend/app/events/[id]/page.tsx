import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, listEventAnnouncements, listEventPerformances, resolveAssetUrl } from "@/lib/api";
import { Announcement, EventCard, EventPerformance } from "@/types";
import { ReservationPanel } from "@/components/events/ReservationPanel";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  let event: EventCard | undefined;
  let announcements: Announcement[] = [];
  let performances: EventPerformance[] = [];

  try {
    event = await getEvent(id);
  } catch {
    event = undefined;
  }

  if (!event) {
    notFound();
  }

  try {
    announcements = await listEventAnnouncements(event.id);
  } catch {
    announcements = [];
  }

  try {
    performances = await listEventPerformances(event.id);
  } catch {
    performances = [];
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {event.flyerImagePath && (
            <div className="mb-4 h-56 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${resolveAssetUrl(event.flyerImagePath)})` }} />
            </div>
          )}
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
          {performances.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">出演情報はまだ登録されていません。</p>
          ) : (
            <div className="mt-3 space-y-2">
              {performances.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.performanceOrder}. {item.bandName}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {item.startTime ?? "--:--"} - {item.endTime ?? "--:--"}
                  </p>
                </div>
              ))}
            </div>
          )}
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
