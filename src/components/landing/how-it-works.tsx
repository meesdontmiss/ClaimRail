"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Database, ListChecks, Bot, Landmark } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Database,
    title: "Import your catalog",
    description:
      "Start with artist-page enrichment or a distributor CSV so ClaimRail has the real songs, dates, and identifiers it needs.",
    color: "text-primary",
    glow: "bg-primary/10 shadow-[0_0_30px_rgba(29,185,84,0.15)]",
    borderGlow: "border-primary/20",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Route each song to the right lane",
    description:
      "Claim Center separates performance, mechanical, and publishing-admin next steps so users know what belongs in BMI, The MLC, or an admin portal.",
    color: "text-purple-400",
    glow: "bg-purple-500/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]",
    borderGlow: "border-purple-500/20",
  },
  {
    number: "03",
    icon: Bot,
    title: "Automate what is safe",
    description:
      "Queue BMI jobs when the metadata is ready, keep worker diagnostics visible, and avoid blind submissions when credentials or selectors fail.",
    color: "text-blue-400",
    glow: "bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    borderGlow: "border-blue-500/20",
  },
  {
    number: "04",
    icon: Landmark,
    title: "Hand off to the official systems",
    description:
      "Open BMI, The MLC, or your publishing admin with the prep already handled. ClaimRail coordinates the work, and the real platforms handle payout.",
    color: "text-primary",
    glow: "bg-primary/10 shadow-[0_0_30px_rgba(29,185,84,0.15)]",
    borderGlow: "border-primary/20",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="relative overflow-hidden py-32" ref={ref}>
      <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/[0.04] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-20 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Four steps to
            </span>{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              recover your royalties
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-[#727280]">
            Most artists do not need another royalty company. They need a cleaner system that tells them what to do next and keeps the work moving.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute bottom-0 left-1/2 top-0 hidden w-px bg-gradient-to-b from-primary/20 via-purple-500/20 to-primary/20 lg:block" />

          <div className="space-y-12 lg:space-y-24">
            {STEPS.map((step, index) => {
              const isLeft = index % 2 === 0;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className={`relative flex flex-col items-center gap-8 lg:flex-row lg:gap-16 ${
                    isLeft ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  <div className={`flex-1 ${isLeft ? "lg:text-right" : "lg:text-left"}`}>
                    <span className={`mb-2 block text-sm font-bold uppercase tracking-widest ${step.color}`}>
                      Step {step.number}
                    </span>
                    <h3 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mx-auto max-w-md text-base leading-relaxed text-[#727280] lg:mx-0">
                      {step.description}
                    </p>
                  </div>

                  <div className="relative shrink-0">
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-2xl border ${step.borderGlow} ${step.glow} transition-all duration-500`}
                    >
                      <step.icon className={`h-8 w-8 ${step.color}`} />
                    </div>
                    <div
                      className={`absolute top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full lg:block ${
                        step.color === "text-primary"
                          ? "bg-primary"
                          : step.color === "text-purple-400"
                          ? "bg-purple-400"
                          : "bg-blue-400"
                      } ${step.glow} ${isLeft ? "-right-[34px]" : "-left-[34px]"}`}
                    />
                  </div>

                  <div className="hidden flex-1 lg:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
