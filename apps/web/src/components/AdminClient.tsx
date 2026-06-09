"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Film, RefreshCw, ShieldCheck, Users } from "lucide-react";
import {
  getAdminFilms,
  getAdminSummary,
  getAdminUsers,
  isApiError,
  updateAdminUserRole
} from "@/lib/api";
import { getAccessToken, verifyAuthSession } from "@/lib/auth";
import type { AdminFilm, AdminSummary, AdminUser, UserRole } from "@/lib/types";

const EMPTY_SUMMARY: AdminSummary = {
  userCount: 0,
  adminCount: 0,
  filmCount: 0,
  sceneCount: 0,
  mediaCount: 0
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 403) {
      return "Admin role is required.";
    }

    return `Request failed with HTTP ${error.status}.`;
  }

  return "The admin console could not be loaded.";
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-stone-950/80 p-4">
      <div className="flex items-center justify-between gap-3 text-stone-400">
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</span>
        <span className="text-projector">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

export function AdminClient() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [summary, setSummary] = useState<AdminSummary>(EMPTY_SUMMARY);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [films, setFilms] = useState<AdminFilm[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const latestFilms = useMemo(() => films.slice(0, 8), [films]);

  async function loadAdminData() {
    const token = getAccessToken();
    const [nextSummary, nextUsers, nextFilms] = await Promise.all([
      getAdminSummary(token),
      getAdminUsers(token),
      getAdminFilms(token)
    ]);

    setSummary(nextSummary);
    setUsers(nextUsers);
    setFilms(nextFilms);
  }

  useEffect(() => {
    let cancelled = false;

    void verifyAuthSession().then(async (me) => {
      if (cancelled) {
        return;
      }

      if (!me) {
        router.replace("/");
        window.dispatchEvent(new Event("cinema-memory:open-login"));
        return;
      }

      if (!me.admin) {
        setCurrentUserId(me.id);
        setError("Admin role is required.");
        setIsReady(true);
        return;
      }

      setCurrentUserId(me.id);

      try {
        await loadAdminData();
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function refresh() {
    setIsRefreshing(true);
    setError("");

    try {
      await loadAdminData();
    } catch (refreshError) {
      setError(errorMessage(refreshError));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function changeRole(user: AdminUser, role: UserRole) {
    if (user.role === role || user.id === currentUserId) {
      return;
    }

    setUpdatingUserId(user.id);
    setError("");

    try {
      const updatedUser = await updateAdminUserRole(getAccessToken(), user.id, role);
      const nextUsers = users.map((item) => (item.id === updatedUser.id ? updatedUser : item));
      setUsers(nextUsers);
      setSummary({
        ...summary,
        adminCount: nextUsers.filter((item) => item.role === "ADMIN").length
      });
    } catch (roleError) {
      setError(errorMessage(roleError));
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (!isReady) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-5">
        <div className="rounded-lg border border-white/10 bg-black/45 px-5 py-4 text-sm text-stone-300">
          Loading admin console...
        </div>
      </main>
    );
  }

  if (error && users.length === 0 && films.length === 0) {
    return (
      <main className="min-h-screen px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-400/30 bg-red-950/20 p-6">
          <div className="flex items-center gap-3 text-red-200">
            <ShieldCheck size={20} />
            <h1 className="text-xl font-semibold">Admin access denied</h1>
          </div>
          <p className="mt-3 text-sm text-red-100/80">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-projector/10 px-3 py-1 text-xs font-semibold text-projector">
              <ShieldCheck size={14} />
              Admin Console
            </div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Service Administration</h1>
            <p className="mt-3 max-w-2xl text-stone-300">
              Review platform activity and manage user roles from one protected workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-400/30 bg-red-950/20 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Users" value={summary.userCount} icon={<Users size={18} />} />
          <StatTile label="Admins" value={summary.adminCount} icon={<ShieldCheck size={18} />} />
          <StatTile label="Films" value={summary.filmCount} icon={<Film size={18} />} />
          <StatTile label="Scenes" value={summary.sceneCount} icon={<Clapperboard size={18} />} />
          <StatTile label="Media" value={summary.mediaCount} icon={<Film size={18} />} />
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Users</h2>
              <span className="text-sm text-stone-500">{users.length.toLocaleString()} total</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-stone-950/80">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.16em] text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const nextRole: UserRole = user.role === "ADMIN" ? "USER" : "ADMIN";

                    return (
                      <tr key={user.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-white">{user.displayName}</p>
                          <p className="mt-1 text-xs text-stone-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                              user.role === "ADMIN"
                                ? "bg-projector/15 text-projector"
                                : "bg-white/10 text-stone-300"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-stone-400">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={isSelf || updatingUserId === user.id}
                            onClick={() => changeRole(user, nextRole)}
                            className="inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-xs font-semibold text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSelf ? "Current admin" : user.role === "ADMIN" ? "Set user" : "Set admin"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Recent Films</h2>
              <span className="text-sm text-stone-500">{films.length.toLocaleString()} total</span>
            </div>

            <div className="grid gap-3">
              {latestFilms.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-stone-950/80 p-5 text-sm text-stone-400">
                  No films have been created yet.
                </div>
              ) : (
                latestFilms.map((film) => (
                  <article key={film.id} className="rounded-lg border border-white/10 bg-stone-950/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">{film.title}</h3>
                        <p className="mt-1 text-xs text-stone-500">
                          {film.ownerDisplayName} / {film.ownerEmail}
                        </p>
                      </div>
                      <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-stone-300">
                        {film.visibility}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                      <span>{film.sceneCount} scenes</span>
                      <span>{formatDate(film.createdAt)}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
