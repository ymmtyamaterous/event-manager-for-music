import Link from "next/link";
import { featuredEvents } from "@/lib/mock-data";

export default function Home() {
  return (
    <div className="space-y-12 py-8">
      <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 px-6 py-14 text-white md:px-12">
        <h1 className="text-3xl font-bold md:text-5xl">ライブイベントを、もっと身近に。</h1>
        <p className="mt-4 max-w-2xl text-blue-50">
          EventManager は、ライブイベントの検索・予約・出演管理を一つにまとめたプラットフォームです。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/events"
            className="bg-blue-100 px-5 py-2.5 font-semibold text-blue-900 rounded-lg hover:bg-white transition-colors"
          >
            イベントを探す
          </Link>
          <Link
            href="/register"
            className="border border-white/70 px-5 py-2.5 font-semibold rounded-lg hover:bg-white/10 transition-colors"
          >
            新規登録
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: "簡単予約",
            body: "気になるイベントはワンクリックで予約。マイページで予約状況もすぐ確認できます。",
          },
          {
            title: "バンド情報",
            body: "出演バンドのプロフィールやSNSをまとめてチェック。初めてのバンドにも出会えます。",
          },
          {
            title: "会場案内",
            body: "会場情報やタイムテーブル、お知らせを事前に確認して当日を安心して迎えられます。",
          },
        ].map((feature) => (
          <article key={feature.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900">{feature.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{feature.body}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-gray-900">開催予定イベント</h2>
          <Link href="/events" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            すべて見る
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuredEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="mb-2 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                予約受付中
              </div>
              <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{event.description}</p>
              <div className="mt-3 text-sm text-gray-700">
                <p>📅 {event.eventDate}</p>
                <p>📍 {event.venueName}</p>
                <p>🎫 {event.ticketPrice ? `${event.ticketPrice.toLocaleString()}円` : "未定"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
