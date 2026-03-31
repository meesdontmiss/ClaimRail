"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Music,
  Search,
  Wrench,
  DollarSign,
  Globe,
  ClipboardCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Music,
    title: "Spotify Library Import",
    description:
      "Log in with Spotify and pull track titles, ISRCs, release dates, and album art into one workspace.",
    color: "from-primary/20 to-primary/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(29,185,84,0.12)]",
    iconColor: "text-primary",
  },
  {
    icon: Search,
    title: "Gap Detection",
    description:
      "We flag the songs that still look unprepared for BMI or Songtrust registration.",
    color: "from-purple-500/20 to-purple-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]",
    iconColor: "text-purple-400",
  },
  {
    icon: ClipboardCheck,
    title: "Registration Prep",
    description:
      "Select songs, fill your writer info once, and generate registration-ready records in bulk.",
    color: "from-blue-500/20 to-blue-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(59,130,246,0.12)]",
    iconColor: "text-blue-400",
  },
  {
    icon: Wrench,
    title: "Metadata Fixing",
    description:
      "Fix missing writers, splits, release dates, and PRO info with guided forms that now update the local catalog state.",
    color: "from-amber-500/20 to-amber-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    iconColor: "text-amber-400",
  },
  {
    icon: DollarSign,
    title: "Claim Readiness Score",
    description:
      "Every song gets a 0-100 score so you can see exactly how ready it is to earn royalties.",
    color: "from-primary/20 to-primary/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(29,185,84,0.12)]",
    iconColor: "text-primary",
  },
  {
    icon: Globe,
    title: "Export Claim Packets",
    description:
      "Download registration-ready CSV files you can route into a backend workflow or submit manually.",
    color: "from-cyan-500/20 to-cyan-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(6,182,212,0.12)]",
    iconColor: "text-cyan-400",
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative overflow-hidden py-32" ref={ref}>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Everything you need to
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              claim what&apos;s yours
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#727280]">
            Your distributor handles the master recording. ClaimRail handles the
            publishing side - the part most indie artists miss.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-500 hover:border-white/[0.1] hover:bg-white/[0.04] ${feature.glow}`}
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} transition-transform duration-300 group-hover:scale-110`}
              >
                <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#727280]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
