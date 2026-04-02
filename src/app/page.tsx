"use client";

import React from "react";
import { Hero } from "@/components/landing/hero";
import { IntroModule } from "@/components/landing/intro-module";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { CTA, Footer } from "@/components/landing/cta";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <IntroModule />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
