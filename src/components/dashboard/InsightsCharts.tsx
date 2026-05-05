'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHistoryStore } from '@/store/historyStore';
import { aggregateByMode, computeWeeklyInsight } from '@/lib/insights';
import { formatDuration, formatCost } from '@/lib/format';

export function InsightsCharts() {
  const entries = useHistoryStore((s) => s.entries);
  // Memoize derived data so re-renders don't re-aggregate on every keystroke elsewhere.
  const byMode = useMemo(() => aggregateByMode(entries), [entries]);
  const weekly = useMemo(() => computeWeeklyInsight(entries), [entries]);

  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Log some commutes to unlock insights.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {weekly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Commutes" value={String(weekly.totalCommutes)} />
              <Stat label="Time" value={formatDuration(weekly.totalMinutes * 60)} />
              <Stat label="Spend" value={formatCost(weekly.totalSpendPaise)} />
              <Stat label="Modes used" value={String(Object.keys(weekly.byMode).length)} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commutes by mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMode}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="mode" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Bar dataKey="commutes" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minutes by mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMode}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="mode" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Bar dataKey="minutes" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-medium">{value}</p>
    </div>
  );
}
