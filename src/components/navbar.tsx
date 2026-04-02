"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Train,
  Menu,
  X,
  LayoutDashboard,
  Link2,
  Search,
  Wrench,
  ClipboardCheck,
  Download,
  LogOut,
  User,
  ChevronDown,
  Settings,
} from "lucide-react";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/connect", label: "Connect", icon: Link2 },
  { href: "/audit", label: "Audit", icon: Search },
  { href: "/fix", label: "Fix", icon: Wrench },
  { href: "/register", label: "Register", icon: ClipboardCheck },
  { href: "/recover", label: "Recover", icon: Download },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);

  const isLanding = pathname === "/";
  const isAppPage = !isLanding;
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenus = () => {
    setMobileOpen(false);
    setAppMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
          scrolled || isAppPage
            ? "border-b border-white/[0.06] bg-[#060609]/80 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" onClick={closeMenus} className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 shadow-[0_0_15px_rgba(29,185,84,0.2)] transition-shadow duration-300 group-hover:shadow-[0_0_25px_rgba(29,185,84,0.35)]">
                <Train className="h-4 w-4 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                ClaimRail
              </span>
            </Link>

            {/* App Navigation - Always visible when authenticated */}
            {(isAppPage || (isLanding && isAuthenticated)) && (
              <div className="hidden items-center gap-1 lg:flex">
                {APP_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      className={cn(
                        "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-[#727280] hover:bg-white/[0.04] hover:text-white/80"
                      )}
                    >
                      <item.icon
                        className={cn("h-3.5 w-3.5", isActive && "text-primary")}
                      />
                      {item.label}
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary shadow-[0_0_8px_rgba(29,185,84,0.6)]"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {isLanding && (
              <div className="hidden items-center gap-6 md:flex">
                {["Features", "How It Works", "Pricing"].map((label) => (
                  <a
                    key={label}
                    href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-[#727280] transition-colors duration-200 hover:text-white"
                    onClick={closeMenus}
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setAppMenuOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[#b3b3b3] transition-colors hover:bg-white/[0.04]"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{session.user.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <AnimatePresence>
                    {appMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#141420]/95 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                      >
                        <div className="mb-1.5 border-b border-white/[0.06] px-2 py-1.5">
                          <p className="text-xs font-semibold text-white/60">Navigation</p>
                        </div>
                        {APP_NAV.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMenus}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === item.href
                                ? "bg-white/[0.08] text-white"
                                : "text-[#b3b3b3] hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        ))}
                        <Link
                          href="/dashboard/settings"
                          onClick={closeMenus}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            pathname === "/dashboard/settings"
                              ? "bg-white/[0.08] text-white"
                              : "text-[#b3b3b3] hover:bg-white/[0.06] hover:text-white"
                          )}
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        <div className="my-1.5 border-t border-white/[0.06]" />
                        <button
                          onClick={() => {
                            closeMenus();
                            signOut();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#b3b3b3] transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  {isLanding ? (
                    <>
                      <button
                        onClick={() => signIn("spotify")}
                        className="hidden text-sm text-[#b3b3b3] transition-colors hover:text-white sm:inline-flex"
                      >
                        Sign in
                      </button>
                      <Link
                        href="/connect"
                        onClick={closeMenus}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(29,185,84,0.3)]"
                      >
                        Get Started Free
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={() => signIn("spotify")}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#1ed760] hover:shadow-[0_0_20px_rgba(29,185,84,0.3)]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      Connect Spotify
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setMobileOpen((open) => !open)}
                className="rounded-lg p-2 text-[#727280] transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/[0.06] bg-[#060609]/95 backdrop-blur-xl lg:hidden"
            >
              <div className="space-y-1 px-4 py-4">
                {(isAppPage || (isLanding && isAuthenticated)) &&
                  APP_NAV.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenus}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-white/[0.08] text-white"
                            : "text-[#727280] hover:bg-white/[0.04] hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn("h-4 w-4", isActive && "text-primary")}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                {isLanding && !isAuthenticated && (
                  <>
                    {["Features", "How It Works", "Pricing"].map((label) => (
                      <a
                        key={label}
                        href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                        className="flex items-center px-3 py-2.5 text-sm text-[#727280] transition-colors hover:text-white"
                        onClick={closeMenus}
                      >
                        {label}
                      </a>
                    ))}
                    <Link
                      href="/connect"
                      onClick={closeMenus}
                      className="mt-2 flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {isAppPage && <div className="h-16" />}
    </>
  );
}
