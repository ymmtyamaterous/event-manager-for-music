"use client";

import { useEffect, useState } from "react";
import { APIUser } from "@/lib/api";

type AuthState = {
  accessToken: string;
  user: APIUser | null;
  /** localStorage の読み込みが完了したかどうか */
  isReady: boolean;
};

/**
 * localStorage からアクセストークンとユーザー情報を安全に読み込むフック。
 * useEffect でマウント後に読み込むため、SSR とクライアントの初回レンダリングが
 * 一致し、ハイドレーションエラーを防ぐ。
 */
export function useAuth(): AuthState {
  const [accessToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("access_token") ?? "";
  });
  const [user] = useState<APIUser | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as APIUser;
    } catch {
      return null;
    }
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // isReady はクライアントマウント後にのみ true にするための意図的な setState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
  }, []);

  return { accessToken, user, isReady };
}
