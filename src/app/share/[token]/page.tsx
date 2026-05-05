import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { decodeShareToken } from '@/services/share';

export const metadata: Metadata = {
  title: 'Shared trip — CommuteWise',
};

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Read-only share viewer. Decodes the token to from/to coords + labels and
 * forwards to the existing /trip/plan client. Invalid tokens redirect home
 * with a query flag so the home page can show an error if it wants.
 */
export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const payload = decodeShareToken(token);
  if (!payload) redirect('/?share_error=1');

  const fromParam = `${payload.from.lat},${payload.from.lng},${encodeURIComponent(payload.fromLabel)}`;
  const toParam = `${payload.to.lat},${payload.to.lng},${encodeURIComponent(payload.toLabel)}`;
  redirect(`/trip/plan?from=${fromParam}&to=${toParam}`);
}
