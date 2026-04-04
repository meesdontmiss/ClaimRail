"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Train } from "lucide-react";

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative overflow-hidden py-32" ref={ref}>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/10 blur-[80px]" />

          <div className="relative px-8 py-16 text-center sm:px-16 sm:py-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                Your music is already out there.
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Make sure you&apos;re getting paid.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mx-auto mb-8 max-w-xl text-lg text-[#727280]"
            >
              Bring your catalog in, route the right next step, and use ClaimRail as the system that keeps royalties work moving without becoming the payout destination itself.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link
                href="/connect"
                className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(29,185,84,0.3)]"
              >
                Start ClaimRail
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <Train className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-white/60">ClaimRail</span>
          </div>
          <p className="text-xs text-[#727280]">
            Your distributor handles release delivery. ClaimRail handles the claim-routing and submission-prep layer around the rights stack.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-[#727280] transition-colors hover:text-white/60">
              Privacy
            </a>
            <a href="#" className="text-xs text-[#727280] transition-colors hover:text-white/60">
              Terms
            </a>
            <a href="#" className="text-xs text-[#727280] transition-colors hover:text-white/60">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
