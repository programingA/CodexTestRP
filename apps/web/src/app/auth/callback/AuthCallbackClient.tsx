"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const hasTokens = useMemo(() => Boolean(accessToken && refreshToken), [accessToken, refreshToken]);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return;
    }

    localStorage.setItem("cinema-memory.access-token", accessToken);
    localStorage.setItem("cinema-memory.refresh-token", refreshToken);
    window.history.replaceState(null, "", "/auth/callback");
  }, [accessToken, refreshToken]);

  return (
    <section className="w-full max-w-md rounded-lg border border-white/10 bg-black/50 p-6 shadow-reel">
      <h1 className="text-2xl font-semibold text-white">
        {hasTokens ? "로그인 처리 완료" : "로그인 토큰이 없습니다"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-300">
        {hasTokens
          ? "OAuth 인증 토큰을 브라우저에 저장했고, 주소창의 토큰 값은 즉시 제거했습니다."
          : "백엔드 OAuth 성공 핸들러가 accessToken과 refreshToken을 전달하도록 환경 설정을 확인하세요."}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-projector px-4 py-2 text-sm font-semibold text-stone-950"
      >
        보관함으로 이동
      </Link>
    </section>
  );
}
