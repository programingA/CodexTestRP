"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Film, LogIn, LogOut, Plus, Projector, Sparkles } from "lucide-react";
import { LoginPanel } from "@/components/LoginPanel";
import { clearAuthSession, getAccessToken, verifyAuthSession } from "@/lib/auth";

export function SiteHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const syncAuth = () => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setIsLoggedIn(false);
        return;
      }

      void verifyAuthSession().then((me) => {
        if (!cancelled) {
          setIsLoggedIn(Boolean(me));
        }
      });
    };
    const openLogin = () => setIsLoginOpen(true);

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("cinema-memory:auth-changed", syncAuth);
    window.addEventListener("cinema-memory:open-login", openLogin);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("cinema-memory:auth-changed", syncAuth);
      window.removeEventListener("cinema-memory:open-login", openLogin);
    };
  }, []);

  function logout() {
    clearAuthSession();
    window.location.assign("/");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/72 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-projector text-stone-950 shadow-[0_0_34px_rgba(246,211,101,0.32)]">
              <Projector size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-projector">Cinema</span>
              <span className="block text-base font-semibold text-white">Memory</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-stone-300 md:flex">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="transition hover:text-white">대시보드</Link>
                <Link href="/films/new" className="transition hover:text-white">필름 만들기</Link>
              </>
            ) : (
              <>
                <Link href="/#films" className="transition hover:text-white">필름 보기</Link>
                <Link href="/#projector" className="transition hover:text-white">상영 경험</Link>
                <button type="button" onClick={() => setIsLoginOpen(true)} className="transition hover:text-white">
                  로그인
                </button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/films/new"
                  className="hidden items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10 sm:inline-flex"
                >
                  <Plus size={15} />
                  새 필름
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-md bg-projector px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
                >
                  <LogOut size={15} />
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/#films"
                  className="hidden items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10 sm:inline-flex"
                >
                  <Film size={15} />
                  둘러보기
                </Link>
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-projector px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
                >
                  <LogIn size={15} />
                  로그인
                </button>
              </>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-projector/70 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-full hidden -translate-x-1/2 items-center gap-2 text-[10px] uppercase tracking-[0.34em] text-projector/70 lg:flex">
          <Sparkles size={12} />
          Now Showing
        </div>
      </header>

      {isLoginOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/72 px-5 backdrop-blur-sm">
          <button
            type="button"
            aria-label="로그인 창 닫기"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsLoginOpen(false)}
          />
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              className="absolute -right-2 -top-12 rounded-md border border-white/10 bg-black/70 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10"
            >
              닫기
            </button>
            <LoginPanel onSuccess={() => setIsLoginOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
