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
        <section className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-6">
          {event.flyerImagePath && (
            <div className="mb-5 h-56 w-full overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#060608]">
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${resolveAssetUrl(event.flyerImagePath)})` }} />
            </div>
          )}
          <h1 className="font-(family-name:--font-bebas-neue) text-3xl tracking-tight text-[#f0eff5]">{event.title}</h1>
          <p className="mt-3 text-sm leading-7 text-[rgba(240,239,245,0.65)]">{event.description}</p>
          <div className="mt-5 space-y-1.5 text-xs text-[#6b6a75]">
            <p>📅 開催日: {event.eventDate}</p>
            <p>📍 会場: {event.venueName}</p>
            <p>🎫 料金: {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
            <p>👥 定員: {event.capacity ?? "未定"}名</p>
          </div>
        </section>

        <section className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-6">
          <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">タイムテーブル</h2>
          {performances.length === 0 ? (
            <p className="mt-3 text-sm text-[#6b6a75]">出演情報はまだ登録されていません。</p>
          ) : (
            <div className="mt-4 space-y-2">
              {performances.map((item) => (
                <div key={item.id} className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] px-4 py-3 transition-colors hover:border-[rgba(255,255,255,0.15)]">
                  <p className="text-sm font-semibold text-[#f0eff5]">
                    {item.performanceOrder}. {item.bandName}
                  </p>
                  <p className="font-(family-name:--font-space-mono) text-xs tracking-wide text-[#6b6a75]">
                    {item.startTime ?? "--:--"} - {item.endTime ?? "--:--"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-6">
          <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">お知らせ</h2>
          {announcements.length === 0 ? (
            <p className="mt-3 text-sm text-[#6b6a75]">現在、お知らせはありません。</p>
          ) : (
            <div className="mt-4 space-y-3">
              {announcements.map((item) => (
                <article key={item.id} className="border border-[rgba(255,255,255,0.08)] p-4">
                  <h3 className="text-sm font-bold text-[#f0eff5]">{item.title}</h3>
                  <p className="mt-1 font-(family-name:--font-space-mono) text-[10px] tracking-wide text-[#6b6a75]">{new Date(item.publishedAt).toLocaleString("ja-JP")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgba(240,239,245,0.65)]">{item.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="bg-[#0d0d12] border border-[rgba(255,255,255,0.08)] p-6 h-fit">
        <h2 className="font-(family-name:--font-bebas-neue) text-2xl tracking-tight text-[#f0eff5]">予約</h2>
        <div className="mt-4 space-y-2">
          <ReservationPanel eventId={event.id} />
          <Link
            href="/events"
            className="block w-full text-center border border-[rgba(255,255,255,0.12)] hover:bg-white/5 text-[#6b6a75] hover:text-[#f0eff5] font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2.5 px-4 transition-colors"
          >
            一覧へ戻る
          </Link>
        </div>
      </aside>
    </div>
  );
}
