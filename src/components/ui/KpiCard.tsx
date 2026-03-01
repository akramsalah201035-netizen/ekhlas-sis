"use client";

import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
        {hint ? <div className="mt-2 text-xs text-slate-400">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}