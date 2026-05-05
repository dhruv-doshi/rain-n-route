'use client';

import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHistoryStore } from '@/store/historyStore';
import { formatDuration, formatCost } from '@/lib/format';
import type { CommuteLogEntry } from '@/types';

function renderEndpoint(end: CommuteLogEntry['from']): string {
  if ('label' in end) return end.label;
  return end.address;
}

export function HistoryTable() {
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const updateActuals = useHistoryStore((s) => s.updateActuals);

  const [editing, setEditing] = useState<CommuteLogEntry | null>(null);
  const [draft, setDraft] = useState({ duration: '', cost: '' });

  function openEdit(entry: CommuteLogEntry) {
    setEditing(entry);
    setDraft({
      duration: entry.actualDuration ? String(Math.round(entry.actualDuration / 60)) : '',
      cost: entry.actualCost ? String(entry.actualCost / 100) : '',
    });
  }

  function saveActuals() {
    if (!editing) return;
    const durationSec = draft.duration ? Number(draft.duration) * 60 : undefined;
    const costPaise = draft.cost ? Math.round(Number(draft.cost) * 100) : undefined;
    updateActuals(editing.id, { duration: durationSec, cost: costPaise });
    setEditing(null);
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No history yet — completed trips will appear here.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Trip</th>
              <th className="px-3 py-2 font-medium">Mode</th>
              <th className="px-3 py-2 font-medium">Duration</th>
              <th className="px-3 py-2 font-medium">Cost</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(e.date).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 max-w-[18ch] truncate">
                  {renderEndpoint(e.from)} → {renderEndpoint(e.to)}
                </td>
                <td className="px-3 py-2">{e.mode}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDuration(e.actualDuration ?? e.estimatedDuration)}
                  {e.actualDuration && (
                    <span className="ml-1 text-xs text-muted-foreground">(actual)</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatCost(e.actualCost ?? e.estimatedCost)}
                  {e.actualCost && (
                    <span className="ml-1 text-xs text-muted-foreground">(actual)</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => openEdit(e)}
                      aria-label="Log actuals"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => remove(e.id)}
                      aria-label="Remove entry"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogTrigger className="hidden" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log actuals</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Actual duration (minutes)
              </span>
              <Input
                type="number"
                min={0}
                value={draft.duration}
                onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
                placeholder="e.g. 35"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Actual cost (₹)
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.cost}
                onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                placeholder="e.g. 75.00"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveActuals}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
