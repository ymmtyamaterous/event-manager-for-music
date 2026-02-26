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
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState<APIUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // localStorage はブラウザ専用APIのため、マウント後に読み込む（ハイドレーションエラー防止）
    /* eslint-disable react-hooks/set-state-in-effect */
    setAccessToken(localStorage.getItem("access_token") ?? "");
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw) as APIUser);
      } catch {
        // ignore
      }
    }
    setIsReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  return { accessToken, user, isReady };
}
