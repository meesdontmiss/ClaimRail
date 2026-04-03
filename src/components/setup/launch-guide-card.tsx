import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GuideStep {
  title: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
  complete?: boolean;
}

interface LaunchGuideCardProps {
  title: string;
  description: string;
  steps: GuideStep[];
  tip: string;
}

export function LaunchGuideCard({
  title,
  description,
  steps,
  tip,
}: LaunchGuideCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            Helpful hints
          </Badge>
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Get fully working faster
          </span>
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={`${step.title}-${index}`}
              className="rounded-xl border border-white/10 bg-black/10 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {step.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                {step.complete ? <Badge variant="success">Done</Badge> : null}
              </div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
              {step.href && step.hrefLabel ? (
                <Link
                  href={step.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                >
                  {step.hrefLabel}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-muted-foreground">{tip}</p>
        </div>
      </CardContent>
    </Card>
  );
}
