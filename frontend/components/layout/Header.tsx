import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          🎵 EventManager
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium text-gray-700">
          <Link href="/events" className="hover:text-blue-700 transition-colors">
            イベント一覧
          </Link>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            ログイン
          </Link>
        </nav>
      </div>
    </header>
  );
}
