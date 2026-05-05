import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — CommuteWise',
  description: 'How CommuteWise handles your data.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 prose prose-sm dark:prose-invert">
      <h1>Privacy</h1>

      <p>
        CommuteWise is a portfolio app. There are no user accounts and no analytics SDKs. This page
        explains the data the app touches and where it goes.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>
          Saved locations, recurring commutes, history entries, and preferences are stored in your
          browser&apos;s IndexedDB. They never leave your device.
        </li>
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
          <strong>MapmyIndia (Mappls):</strong> address autocomplete and route requests are proxied
          through our own <code>/api/maps/*</code> handlers, which call Mappls server-side. Your
          search query and trip coordinates are sent to Mappls as part of the request.
        </li>
        <li>
          <strong>OpenStreetMap Nominatim:</strong> when an address needs resolving to coordinates,
          the place label is sent to Nominatim&apos;s public endpoint.
        </li>
        <li>
          <strong>OpenWeatherMap:</strong> coordinates of route waypoints are sent to fetch the
          current weather and forecast.
        </li>
        <li>
          <strong>OpenStreetMap / CARTO basemap tiles:</strong> the map tiles you see are fetched
          directly from OSM / CARTO tile servers.
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
