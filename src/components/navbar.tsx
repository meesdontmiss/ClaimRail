"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Train,
  Menu,
  X,
  LayoutDashboard,
  ListChecks,
  Link2,
  Search,
  Wrench,
  ClipboardCheck,
  Download,
  LogOut,
  User,
  ChevronDown,
  Settings,
  Bot,
} from "lucide-react";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/connect", label: "Import", icon: Link2 },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isLanding = pathname === "/";
  const isAppPage = !isLanding;
  const isConnectPage = pathname === "/connect";
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenus = () => {
    setMobileOpen(false);
    setWorkspaceMenuOpen(false);
    setProfileMenuOpen(false);
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
              {(isAppPage || (isLanding && isAuthenticated)) && (
                <div className="hidden items-center gap-1 md:flex">
                  {APP_NAV.map((item) => {
                    const isActive = pathname === item.href || (item.href === "/dashboard" && pathname.startsWith("/dashboard"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenus}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-white/[0.08] text-white"
                            : "text-[#b3b3b3] hover:bg-white/[0.04] hover:text-white"
                        )}
                      >
                        <item.icon className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileMenuOpen((open) => !open);
                      setWorkspaceMenuOpen(false);
                    }}
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
                    {profileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#141420]/95 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                      >
                        <div className="mb-1.5 border-b border-white/[0.06] px-2 py-1.5">
                          <p className="text-xs font-semibold text-white/60">Account</p>
                        </div>
                        <div className="px-3 py-2">
                          <p className="truncate text-sm font-medium text-white">
                            {session.user.name}
                          </p>
                          {session.user.email ? (
                            <p className="truncate text-xs text-white/45">{session.user.email}</p>
                          ) : null}
                        </div>
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
                        <button
                          onClick={() => {
                            closeMenus();
                            setMobileOpen(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#b3b3b3] transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
                        >
                          <Menu className="h-4 w-4" />
                          Open navigation
                        </button>
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
                        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
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
                      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-red-700 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                      hidden={isConnectPage}
                      aria-hidden={isConnectPage}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in
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
