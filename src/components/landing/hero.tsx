"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, ShieldCheck, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/[0.07] blur-[150px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-500/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-blue-500/[0.04] blur-[100px]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-4 py-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">
            Flat $20/year pricing
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
        >
          <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
            Stop leaving
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
            royalties
          </span>{" "}
          <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
            on the table
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#727280] sm:text-xl"
        >
          ClaimRail imports your catalog, routes every song to the right claim
          lane, and gives you an ops layer for BMI, The MLC, and publishing-admin
          handoff - so you collect{" "}
          <span className="font-medium text-white/90">
            every dollar you&apos;re owed
          </span>
          without pretending to replace the platforms that actually pay artists.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/connect"
            className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_40px_rgba(29,185,84,0.3)]"
          >
            <ShieldCheck className="h-5 w-5" />
            Start Your Claim Workflow
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/claims"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3.5 text-base font-medium text-[#b3b3b3] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <ShieldCheck className="h-4 w-4" />
            View Claim Center
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3.5 text-base font-medium text-[#b3b3b3] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <Play className="h-4 w-4" />
            See How It Works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mx-auto max-w-5xl rounded-[28px] border border-white/[0.06] bg-white/[0.02] px-6 py-6 backdrop-blur-sm"
        >
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { value: "$2.5B+", label: "Unclaimed royalties globally" },
                { value: "3", label: "Core lanes: performance, mechanical, admin" },
                { value: "$20/yr", label: "Simple annual ClaimRail plan" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 + index * 0.15 }}
                  className="rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-center"
                >
                  <p className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-[#727280] sm:text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.35 }}
              className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 text-left"
            >
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                New core flow
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                Import the catalog, route each song, automate what is safe, then open the official destination with the prep already done.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
