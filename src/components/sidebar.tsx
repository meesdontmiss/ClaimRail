"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListChecks,
  Link2,
  Search,
  Wrench,
  Download,
  Train,
  ClipboardCheck,
  LogOut,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/claims", label: "Claim Center", icon: ListChecks },
  { href: "/connect", label: "Connect", icon: Link2 },
  { href: "/audit", label: "Audit", icon: Search },
  { href: "/fix", label: "Fix", icon: Wrench },
  { href: "/register", label: "Register", icon: ClipboardCheck },
  { href: "/recover", label: "Recover", icon: Download },
];

function UserBlock() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sidebar-muted" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-sidebar-muted" />
          <div className="h-2 w-16 animate-pulse rounded bg-sidebar-muted" />
        </div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {session.user.name}
            </p>
            <p className="truncate text-xs text-sidebar-accent">
              Spotify Connected
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sidebar-accent transition-colors hover:bg-sidebar-muted hover:text-sidebar-foreground"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
        <p className="px-2 text-[10px] text-sidebar-accent/60">
          ClaimRail Pro - $20/year
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Link
        href="/connect"
        className="flex w-full items-center gap-2 rounded-lg bg-[#1DB954] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1ed760]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        Connect with Spotify
      </Link>
      <p className="px-2 text-[10px] text-sidebar-accent/60">
        ClaimRail Pro - $20/year
      </p>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col overflow-hidden border-r border-white/[0.04] bg-[#060609] text-sidebar-foreground">
      <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-[100px] opacity-40" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-40 w-40 rounded-full bg-purple-500/10 blur-[80px] opacity-30" />

      <div className="relative flex h-16 items-center gap-2.5 border-b border-white/[0.04] px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 shadow-[0_0_15px_rgba(29,185,84,0.2)]">
          <Train className="h-4 w-4 text-primary" />
        </div>
        <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          ClaimRail
        </span>
      </div>

      <nav className="relative flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.08] text-white shadow-[0_0_20px_rgba(29,185,84,0.1)]"
                  : "text-[#727280] hover:bg-white/[0.04] hover:text-white/80"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_rgba(29,185,84,0.6)]" />
              )}
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "group-hover:text-white/60"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/[0.04] px-4 py-4">
        <UserBlock />
      </div>
    </aside>
  );
}
