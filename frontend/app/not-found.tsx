import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-gray-600">URL を確認するか、トップページから再度お試しください。</p>
      <Link
        href="/"
        className="mt-5 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        トップページへ
      </Link>
    </div>
  );
}
