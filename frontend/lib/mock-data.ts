import { EventCard } from "@/types";

export const featuredEvents: EventCard[] = [
  {
    id: "evt-20260320",
    title: "春の音楽祭 2026",
    description: "渋谷を舞台にした春の大型ライブイベント。ジャンルを超えたバンドが集結します。",
    venueName: "渋谷 CLUB ASIA",
    eventDate: "2026-03-20",
    ticketPrice: 3000,
    capacity: 200,
    status: "published",
  },
  {
    id: "evt-20260410",
    title: "NIGHT BEAT SESSION",
    description: "新進気鋭バンド中心のナイトイベント。深夜帯ならではの熱量を体感できます。",
    venueName: "新宿 LOFT",
    eventDate: "2026-04-10",
    ticketPrice: 3500,
    capacity: 250,
    status: "published",
  },
  {
    id: "evt-20260502",
    title: "Acoustic Harbor",
    description: "アコースティック中心の落ち着いたイベント。初出演バンド枠も多数。",
    venueName: "横浜 Bay Hall",
    eventDate: "2026-05-02",
    ticketPrice: null,
    capacity: 150,
    status: "published",
  },
];
