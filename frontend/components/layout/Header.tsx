"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  const [user, setUser] = useState<APIUser | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as APIUser;
    } catch {
      return null;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-gray-900" onClick={closeMobileMenu}>
          🎵 EventManager
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 sm:hidden"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="メニューを開閉"
          aria-expanded={isMobileMenuOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav className="hidden items-center gap-5 text-sm font-medium text-gray-700 sm:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-blue-700">
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={openLogoutModal}
              className="rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-900"
            >
              ログアウト
            </button>
          ) : (
            <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700">
              ログイン
            </Link>
          )}
        </nav>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-gray-700">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMobileMenu} className="transition-colors hover:text-blue-700">
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={openLogoutModal}
                className="rounded-lg bg-gray-800 px-4 py-2 text-left font-semibold text-white transition-colors hover:bg-gray-900"
              >
                ログアウト
              </button>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                ログイン
              </Link>
            )}
          </nav>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeLogoutModal}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">ログアウト確認</h2>
            <p className="mt-2 text-sm text-gray-600">ログアウトしてよろしいですか？</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLogoutModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
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
