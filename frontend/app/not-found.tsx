import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-10 text-center">
        <p className="font-(family-name:--font-space-mono) text-xs tracking-[4px] text-[#ff2d55] uppercase mb-4">404</p>
        <h1 className="font-(family-name:--font-bebas-neue) text-5xl tracking-wider text-[#f0eff5] mb-3">
          PAGE NOT FOUND
        </h1>
        <p className="text-sm text-[#6b6a75] mb-8">
          URL を確認するか、トップページから再度お試しください。
        </p>
        <Link
          href="/"
          className="inline-block font-(family-name:--font-space-mono) text-xs tracking-[2px] bg-[#ff2d55] hover:bg-[#ff5470] text-white px-8 py-3 transition-colors"
        >
          TOP PAGE
        </Link>
      </div>
    </div>
  );
}
