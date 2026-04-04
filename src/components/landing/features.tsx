"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Music,
  Search,
  Wrench,
  Landmark,
  Bot,
  ListChecks,
  Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: Music,
    title: "Catalog Intake",
    description:
      "Bring in a real catalog snapshot from artist-page enrichment or distributor CSVs and keep it in one clean workspace.",
    color: "from-primary/20 to-primary/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(29,185,84,0.12)]",
    iconColor: "text-primary",
  },
  {
    icon: ListChecks,
    title: "Claim Center Routing",
    description:
      "See which songs are ready for BMI, which need The MLC, and which belong with a publishing admin instead of forcing everything into one form.",
    color: "from-purple-500/20 to-purple-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]",
    iconColor: "text-purple-400",
  },
  {
    icon: Search,
    title: "Rights Gap Detection",
    description:
      "We flag the songs that still look unprepared for performance, mechanical, or publishing-admin follow-through.",
    color: "from-blue-500/20 to-blue-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(59,130,246,0.12)]",
    iconColor: "text-blue-400",
  },
  {
    icon: Wrench,
    title: "Metadata Fixing",
    description:
      "Fix missing writers, splits, release dates, and PRO details before the destination portals ever see a broken submission.",
    color: "from-amber-500/20 to-amber-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    iconColor: "text-amber-400",
  },
  {
    icon: Bot,
    title: "Automation Queue",
    description:
      "Queue autonomous BMI jobs, monitor worker heartbeats, and retry or cancel jobs when something goes wrong.",
    color: "from-primary/20 to-primary/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(29,185,84,0.12)]",
    iconColor: "text-primary",
  },
  {
    icon: Landmark,
    title: "Official Portal Handoff",
    description:
      "ClaimRail stays the orchestration layer. BMI, The MLC, and your publishing admin stay the actual payout destinations.",
    color: "from-cyan-500/20 to-cyan-500/5",
    glow: "group-hover:shadow-[0_0_40px_rgba(6,182,212,0.12)]",
    iconColor: "text-cyan-400",
  },
  {
    icon: Globe,
    title: "Export + Evidence",
    description:
      "Export claim packets, review readiness, and keep a clearer audit trail of what was queued, handed off, or already covered.",
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
            ClaimRail is the rights-ops layer between your catalog and the official systems that actually register and pay out.
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
