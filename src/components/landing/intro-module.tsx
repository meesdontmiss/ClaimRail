"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Bot, Search, ShieldCheck, Sparkles } from "lucide-react";

const CARDS = [
  {
    eyebrow: "Step 01",
    title: "We pull your catalog into one clean control room",
    description:
      "ClaimRail connects to Spotify, organizes your releases, and gives independent artists one place to see what metadata is complete, missing, or blocking payouts.",
    accent: "from-primary/20 via-primary/10 to-transparent",
    border: "border-primary/20",
    glow: "shadow-[0_0_50px_rgba(29,185,84,0.10)]",
    icon: Sparkles,
    visual: CatalogOrbit,
  },
  {
    eyebrow: "Step 02",
    title: "We expose the silent royalty leaks hiding in your songs",
    description:
      "Our audit layer checks ISRCs, writers, splits, release dates, and registration readiness so you know exactly why a song is not ready to earn on the publishing side.",
    accent: "from-blue-500/20 via-blue-500/10 to-transparent",
    border: "border-blue-500/20",
    glow: "shadow-[0_0_50px_rgba(59,130,246,0.10)]",
    icon: Search,
    visual: AuditScanner,
  },
  {
    eyebrow: "Step 03",
    title: "We turn messy metadata into registration-ready records",
    description:
      "Instead of chasing spreadsheets and forms, artists fix issues inside guided workflows and ClaimRail prepares the exact writer and work details needed for BMI registration.",
    accent: "from-amber-500/20 via-amber-500/10 to-transparent",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_50px_rgba(245,158,11,0.10)]",
    icon: ShieldCheck,
    visual: MetadataAssembler,
  },
  {
    eyebrow: "Step 04",
    title: "Your background worker pushes submissions while you keep creating",
    description:
      "Once credentials are saved, ClaimRail can queue autonomous BMI jobs, track progress, and give indie artists a real operations layer for collecting money that usually gets left behind.",
    accent: "from-fuchsia-500/20 via-fuchsia-500/10 to-transparent",
    border: "border-fuchsia-500/20",
    glow: "shadow-[0_0_50px_rgba(217,70,239,0.10)]",
    icon: Bot,
    visual: WorkerPipeline,
  },
];

function SectionHeading({ isInView }: { isInView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65 }}
      className="mx-auto max-w-3xl text-center"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-4 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
          Why ClaimRail Exists
        </span>
      </div>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        <span className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
          An animated walkthrough of how
        </span>
        <br />
        <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
          ClaimRail turns lost publishing money into action
        </span>
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-[#8a8a97]">
        Independent artists usually have the songs, streams, and fan momentum already.
        What they do not have is a simple system for finding missing publishing metadata,
        fixing it fast, and actually moving registrations forward. That is the gap ClaimRail fills.
      </p>
    </motion.div>
  );
}

function CatalogOrbit() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" fill="none" aria-hidden="true">
      <motion.circle
        cx="160"
        cy="108"
        r="68"
        stroke="rgba(29,185,84,0.22)"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "160px 108px" }}
      />
      <motion.circle
        cx="160"
        cy="108"
        r="44"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        strokeDasharray="4 10"
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "160px 108px" }}
      />
      <motion.rect
        x="116"
        y="60"
        width="88"
        height="96"
        rx="20"
        fill="rgba(8,12,16,0.86)"
        stroke="rgba(29,185,84,0.26)"
        animate={{ y: [60, 55, 60] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.rect x="132" y="80" width="56" height="8" rx="4" fill="rgba(29,185,84,0.95)" />
      <motion.rect x="132" y="96" width="44" height="6" rx="3" fill="rgba(255,255,255,0.24)" />
      <motion.rect x="132" y="108" width="50" height="6" rx="3" fill="rgba(255,255,255,0.16)" />
      <motion.rect x="132" y="120" width="34" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
      {[0, 1, 2].map((index) => (
        <motion.circle
          key={index}
          cx={160}
          cy={40}
          r="6"
          fill="rgba(29,185,84,0.85)"
          animate={{
            rotate: 360,
          }}
          transition={{ duration: 6 + index * 2, repeat: Infinity, ease: "linear" }}
          style={{
            transformOrigin: "160px 108px",
            transformBox: "fill-box",
          }}
        />
      ))}
    </svg>
  );
}

function AuditScanner() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" fill="none" aria-hidden="true">
      <rect x="54" y="46" width="212" height="128" rx="24" fill="rgba(7,11,18,0.88)" stroke="rgba(59,130,246,0.25)" />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <rect x="82" y={68 + row * 24} width="96" height="8" rx="4" fill="rgba(255,255,255,0.14)" />
          <rect x="192" y={68 + row * 24} width="46" height="8" rx="4" fill={row < 2 ? "rgba(227,72,80,0.72)" : "rgba(29,185,84,0.72)"} />
        </g>
      ))}
      <motion.rect
        x="68"
        y="58"
        width="184"
        height="22"
        rx="11"
        fill="rgba(59,130,246,0.14)"
        animate={{ y: [58, 130, 58] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.line
        x1="66"
        y1="69"
        x2="254"
        y2="69"
        stroke="rgba(96,165,250,0.92)"
        strokeWidth="2"
        animate={{ y1: [69, 141, 69], y2: [69, 141, 69] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="250"
        cy="148"
        r="18"
        fill="rgba(59,130,246,0.16)"
        stroke="rgba(96,165,250,0.8)"
        strokeWidth="1.5"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <path d="M246 148l4 4 8-8" stroke="rgba(96,165,250,0.95)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetadataAssembler() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" fill="none" aria-hidden="true">
      <rect x="46" y="44" width="100" height="132" rx="22" fill="rgba(15,11,6,0.9)" stroke="rgba(245,158,11,0.22)" />
      <rect x="174" y="44" width="100" height="132" rx="22" fill="rgba(10,15,11,0.88)" stroke="rgba(29,185,84,0.18)" />
      {[0, 1, 2].map((index) => (
        <motion.rect
          key={index}
          x="70"
          y={72 + index * 26}
          width={index === 1 ? "54" : "62"}
          height="10"
          rx="5"
          fill="rgba(255,255,255,0.15)"
          animate={{ opacity: [0.35, 0.95, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.25 }}
        />
      ))}
      {[0, 1, 2].map((index) => (
        <motion.rect
          key={index}
          x="196"
          y={72 + index * 26}
          width={index === 1 ? "48" : "62"}
          height="10"
          rx="5"
          fill="rgba(29,185,84,0.75)"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 1 + index * 0.25 }}
        />
      ))}
      <motion.path
        d="M142 92C162 92 158 92 178 92"
        stroke="rgba(245,158,11,0.75)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 10"
        animate={{ strokeDashoffset: [18, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d="M142 118C162 118 158 118 178 118"
        stroke="rgba(245,158,11,0.55)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 10"
        animate={{ strokeDashoffset: [18, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear", delay: 0.2 }}
      />
      <motion.circle
        cx="160"
        cy="156"
        r="18"
        fill="rgba(245,158,11,0.14)"
        stroke="rgba(245,158,11,0.8)"
        strokeWidth="1.5"
        animate={{ scale: [1, 1.08, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <path d="M152 156h16M160 148v16" stroke="rgba(245,158,11,0.95)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function WorkerPipeline() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" fill="none" aria-hidden="true">
      <rect x="42" y="84" width="70" height="52" rx="18" fill="rgba(10,15,18,0.88)" stroke="rgba(255,255,255,0.09)" />
      <rect x="125" y="64" width="70" height="92" rx="22" fill="rgba(17,8,20,0.92)" stroke="rgba(217,70,239,0.24)" />
      <rect x="208" y="84" width="70" height="52" rx="18" fill="rgba(8,15,11,0.9)" stroke="rgba(29,185,84,0.18)" />
      <motion.path
        d="M112 110H125"
        stroke="rgba(217,70,239,0.72)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [16, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d="M195 110H208"
        stroke="rgba(29,185,84,0.72)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 8"
        animate={{ strokeDashoffset: [16, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.rect
        x="145"
        y="88"
        width="30"
        height="8"
        rx="4"
        fill="rgba(255,255,255,0.18)"
        animate={{ opacity: [0.35, 0.95, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <motion.rect
        x="145"
        y="104"
        width="22"
        height="8"
        rx="4"
        fill="rgba(255,255,255,0.18)"
        animate={{ opacity: [0.35, 0.95, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.25 }}
      />
      <motion.rect
        x="145"
        y="120"
        width="34"
        height="8"
        rx="4"
        fill="rgba(255,255,255,0.18)"
        animate={{ opacity: [0.35, 0.95, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
      />
      {[0, 1, 2].map((index) => (
        <motion.circle
          key={index}
          cx={78}
          cy={100 + index * 10}
          r="3.5"
          fill="rgba(255,255,255,0.82)"
          animate={{ x: [0, 58, 136], opacity: [0.1, 1, 0.1] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.3, ease: "easeInOut" }}
        />
      ))}
      <motion.circle
        cx="242"
        cy="110"
        r="16"
        fill="rgba(29,185,84,0.12)"
        stroke="rgba(29,185,84,0.8)"
        strokeWidth="1.5"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <path d="M236 110l4 4 9-10" stroke="rgba(29,185,84,0.95)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IntroModule() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <section id="intro-module" ref={ref} className="relative overflow-hidden py-28 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute left-[10%] top-20 h-72 w-72 rounded-full bg-primary/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute right-[8%] top-1/3 h-80 w-80 rounded-full bg-cyan-500/[0.04] blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-fuchsia-500/[0.04] blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading isInView={isInView} />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {CARDS.map((card, index) => {
            const Visual = card.visual;

            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: index * 0.12 }}
                className={`group relative overflow-hidden rounded-[28px] border ${card.border} bg-[#080a0f]/88 p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/16 ${card.glow} sm:p-7`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-80`} />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

                <div className="relative flex h-full flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                        {card.eyebrow}
                      </p>
                      <h3 className="mt-3 max-w-xl text-2xl font-semibold leading-tight text-white sm:text-[1.75rem]">
                        {card.title}
                      </h3>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                      <card.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.06] bg-black/20 p-4">
                    <div className="mx-auto h-52 max-w-sm">
                      <Visual />
                    </div>
                  </div>

                  <p className="max-w-xl text-sm leading-7 text-[#9a9aa8] sm:text-[15px]">
                    {card.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-8 rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">
                What This Means For Artists
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                ClaimRail acts like an ops team for the publishing side of your music career.
              </h3>
              <p className="mt-4 text-base leading-8 text-[#8f8f9c]">
                Instead of learning every admin system from scratch, independent artists get a guided pipeline:
                import the catalog, surface the money leaks, fix the blockers, then queue background work that helps
                move registrations toward completion. The payoff is simple: less chaos, less money missed, and more
                time spent actually making music.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[26rem]">
              {[
                { label: "Less admin sprawl", value: "One workspace" },
                { label: "Faster issue fixing", value: "Guided flows" },
                { label: "More royalty capture", value: "Actionable queue" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4"
                >
                  <p className="text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
            Explore the rest of the product below
            <ArrowRight className="h-4 w-4" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
