import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — Rain-N-Route',
  description: 'How Rain-N-Route handles your data.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 prose prose-sm dark:prose-invert">
      <h1>Privacy</h1>

      <p>
        Rain-N-Route is a portfolio app. There are no user accounts and no analytics SDKs. This page
        explains the data the app touches and where it goes.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>
          The current trip plan is stored in <code>sessionStorage</code> and clears when the tab
          closes.
        </li>
        <li>
          Essentials checklist state and the PWA install-prompt cooldown use{' '}
          <code>sessionStorage</code> / <code>localStorage</code>.
        </li>
      </ul>

      <h2>What we send to third parties</h2>
      <ul>
        <li>
          <strong>Google Maps Platform:</strong> place autocomplete, geocoding, and route requests
          are proxied through our own <code>/api/maps/*</code> handlers, which call Google Places
          API, Geocoding API, and Routes API server-side. Your search query and trip coordinates are
          sent to Google as part of these requests. The browser loads the Google Maps JavaScript API
          to render the interactive map.
        </li>
        <li>
          <strong>OpenWeatherMap:</strong> coordinates of route waypoints are sent to fetch the
          current weather and forecast.
        </li>
      </ul>
      <p>We do not include any user identifier in those requests. They are made over HTTPS.</p>

      <h2>Cookies & tracking</h2>
      <p>None. No analytics, no advertising, no third-party trackers.</p>

      <h2>Notifications</h2>
      <p>
        If you tap &ldquo;Notify me to leave&rdquo;, the browser will ask for notification
        permission. The notification is scheduled and fires locally — nothing is sent to a remote
        server. If you close the tab before the scheduled time, the notification is cancelled.
      </p>

      <h2>Erasing your data</h2>
      <p>
        Clear your browser&apos;s site data for this origin (Settings → Privacy → Site Data). That
        wipes IndexedDB, sessionStorage, and localStorage in one step.
      </p>

      <p className="text-sm text-muted-foreground">Last updated: 2026-05-05.</p>
    </article>
  );
}
