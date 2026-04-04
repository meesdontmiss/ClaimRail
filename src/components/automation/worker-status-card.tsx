"use client";

import { Card, CardContent } from "@/components/ui/card";

interface WorkerStatusCardProps {
  lastSeenAt: string | null;
}

export function WorkerStatusCard({ lastSeenAt }: WorkerStatusCardProps) {
  return (
    <Card>
      <CardContent className="py-6">
        <p className={`text-3xl font-bold ${lastSeenAt ? "text-primary" : ""}`}>
          {lastSeenAt ? "Heartbeat seen" : "No heartbeat"}
        </p>
        <p className="text-sm text-muted-foreground">
          Worker status{" "}
          {lastSeenAt ? `· last ping ${new Date(lastSeenAt).toLocaleString()}` : "· no worker ping yet"}
        </p>
      </CardContent>
    </Card>
  );
}
