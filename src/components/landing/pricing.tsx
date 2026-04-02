"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";

const INCLUDED = [
  "Spotify import",
  "Unlimited song scans",
  "BMI and Songtrust prep flags",
  "Bulk registration prep",
  "Metadata fixing tools",
  "Claim readiness scoring",
  "CSV export packets",
  "Progress tracking dashboard",
];

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="relative overflow-hidden py-32" ref={ref}>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Free until you
            </span>{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              earn
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-[#727280]">
            ClaimRail Core stays success-based. The Chrome extension Pro add-on is
            available separately for teams that want browser automation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-lg"
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-white/[0.02] backdrop-blur-sm">
            <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_40px_rgba(29,185,84,0.05)]" />

            <div className="relative p-8 sm:p-10">
              <div className="mb-8 text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Most popular</span>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl font-bold text-transparent sm:text-7xl">
                    1%
                  </span>
                  <span className="text-lg text-[#727280]">on payouts</span>
                </div>
                <p className="mt-3 text-sm text-[#727280]">
                  That&apos;s it. Scan, fix, and register your entire catalog for free.
                  <br />
                  We only take 1% when royalties are paid to you.
                </p>
              </div>

              <div className="mb-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="mb-8 space-y-3">
                {INCLUDED.map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-[#b3b3b3]">{item}</span>
                  </motion.div>
                ))}
              </div>

              <Link
                href="/connect"
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_40px_rgba(29,185,84,0.25)]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-4 text-center text-xs text-[#727280]">
                No credit card required. Connect Spotify and start in 30 seconds.
              </p>
              <p className="mt-2 text-center text-xs text-[#727280]">
                Need the extension? ClaimRail Pro adds browser automation as an
                annual add-on.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-[#727280]">
            Compare: Songtrust charges{" "}
            <span className="text-white/70">$100/yr + 15% commission</span>.
            TuneCore Publishing charges{" "}
            <span className="text-white/70">$75/yr</span>. ClaimRail charges{" "}
            <span className="font-medium text-primary">nothing upfront</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
