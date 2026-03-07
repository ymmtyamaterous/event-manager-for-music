"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APIUser } from "@/lib/api";

type NavItem = {
  href: string;
  label: string;
};

function getRoleNavItems(user: APIUser | null): NavItem[] {
  if (!user) {
    return [{ href: "/events", label: "イベント一覧" }];
  }

  const base: NavItem[] = [{ href: "/events", label: "イベント一覧" }];

  if (user.user_type === "audience") {
    base.push({ href: "/audience", label: "マイページ" });
  } else if (user.user_type === "organizer") {
    base.push({ href: "/organizer", label: "運営" });
  } else if (user.user_type === "performer") {
    base.push({ href: "/performer", label: "出演者" });
  }

  base.push({ href: "/profile", label: "プロフィール" });
  return base;
}

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<APIUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    // localStorage はブラウザ専用APIのため、マウント後に読み込む（ハイドレーションエラー防止）
    const raw = localStorage.getItem("user");
    if (!raw) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(raw) as APIUser);
    } catch {
      // ignore
    }
  }, []);

  const navItems = useMemo(() => getRoleNavItems(user), [user]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setIsLogoutModalOpen(false);
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  const openLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(6,6,8,0.90)] backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="font-(family-name:--font-bebas-neue) text-2xl tracking-[4px] text-[#f0eff5] hover:text-[#ff2d55] transition-colors" onClick={closeMobileMenu}>
          STAGECRAFT
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-2 text-[#6b6a75] hover:text-[#f0eff5] hover:bg-white/5 sm:hidden transition-colors"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="メニューを開閉"
          aria-expanded={isMobileMenuOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav className="hidden items-center gap-8 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75] transition-colors hover:text-[#f0eff5]"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={openLogoutModal}
              className="font-(family-name:--font-space-mono) text-xs tracking-[2px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[#6b6a75] transition-colors hover:text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)]"
            >
              ログアウト
            </button>
          ) : (
            <Link
              href="/login"
              className="font-(family-name:--font-space-mono) text-xs tracking-[2px] bg-[#ff2d55] px-4 py-2 text-white transition-all hover:bg-[#ff5470] hover:shadow-[0_8px_24px_rgba(255,45,85,0.35)]"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#0d0d12] px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="font-(family-name:--font-space-mono) text-xs tracking-[2px] text-[#6b6a75] transition-colors hover:text-[#f0eff5]"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={openLogoutModal}
                className="font-(family-name:--font-space-mono) text-xs tracking-[2px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-left text-[#6b6a75] transition-colors hover:text-[#f0eff5]"
              >
                ログアウト
              </button>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="font-(family-name:--font-space-mono) text-xs tracking-[2px] inline-block bg-[#ff2d55] px-4 py-2 text-white transition-colors hover:bg-[#ff5470]"
              >
                ログイン
              </Link>
            )}
          </nav>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeLogoutModal}>
          <div className="w-full max-w-sm border border-[rgba(255,255,255,0.12)] bg-[#0d0d12] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#f0eff5]">ログアウト確認</h2>
            <p className="mt-2 text-sm text-[#6b6a75]">ログアウトしてよろしいですか？</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLogoutModal}
                className="border border-[rgba(255,255,255,0.12)] px-4 py-2 text-sm font-(family-name:--font-space-mono) tracking-wide text-[#6b6a75] hover:text-[#f0eff5] transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-[#ff2d55] px-4 py-2 text-sm font-(family-name:--font-space-mono) tracking-wide text-white hover:bg-[#ff5470] transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
