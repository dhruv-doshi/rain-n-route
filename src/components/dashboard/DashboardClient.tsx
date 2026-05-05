'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavedLocationList } from './SavedLocationList';
import { RecurringCommuteForm } from './RecurringCommuteForm';
import { HistoryTable } from './HistoryTable';
import { InsightsCharts } from './InsightsCharts';
import { PreferencesForm } from './PreferencesForm';

const TABS = [
  { value: 'locations', label: 'Locations' },
  { value: 'commutes', label: 'Commutes' },
  { value: 'history', label: 'History' },
  { value: 'insights', label: 'Insights' },
  { value: 'preferences', label: 'Preferences' },
] as const;

export function DashboardClient() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-6">
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <Tabs defaultValue="locations">
        <TabsList className="mb-4 w-full overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 whitespace-nowrap">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="locations">
          <SavedLocationList />
        </TabsContent>
        <TabsContent value="commutes">
          <RecurringCommuteForm />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTable />
        </TabsContent>
        <TabsContent value="insights">
          <InsightsCharts />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
