import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { WeatherRiskBadge } from '@/components/trip/WeatherRiskBadge';
import type { WeatherRiskSummary } from '@/types';

const LOW_RISK: WeatherRiskSummary = {
  overall: 'low',
  factors: [],
  gear: [],
  bufferMinutesRecommended: 0,
};

const HIGH_RISK: WeatherRiskSummary = {
  overall: 'high',
  factors: [
    { kind: 'rain', level: 'high', reason: 'Up to 5.0 mm of precipitation expected' },
    {
      kind: 'flood',
      level: 'moderate',
      reason: 'Heavy rainfall with 70% chance — possible waterlogging',
    },
  ],
  gear: [
    { id: 'umbrella', label: 'Umbrella', reason: 'Rain expected along your route' },
    { id: 'raincoat', label: 'Raincoat', reason: 'Heavy rain expected — stay dry' },
  ],
  bufferMinutesRecommended: 15,
};

describe('WeatherRiskBadge', () => {
  it('renders the overall risk label', () => {
    render(<WeatherRiskBadge risk={LOW_RISK} />);
    expect(screen.getByText(/low weather risk/i)).toBeInTheDocument();
  });

  it('shows buffer advice when bufferMinutesRecommended > 0', () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    expect(screen.getByText(/\+15 min buffer advised/i)).toBeInTheDocument();
  });

  it('hides buffer advice when bufferMinutesRecommended is 0', () => {
    render(<WeatherRiskBadge risk={LOW_RISK} />);
    expect(screen.queryByText(/buffer advised/i)).not.toBeInTheDocument();
  });

  it('does not show expand button when there are no factors or gear', () => {
    render(<WeatherRiskBadge risk={LOW_RISK} />);
    expect(
      screen.queryByRole('button', { name: /expand weather details/i }),
    ).not.toBeInTheDocument();
  });

  it('shows expand button when risk has details', () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    expect(screen.getByRole('button', { name: /expand weather details/i })).toBeInTheDocument();
  });

  it('details are hidden before expanding', () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    expect(screen.queryByText('Rain')).not.toBeInTheDocument();
    expect(screen.queryByText('Umbrella')).not.toBeInTheDocument();
  });

  it('expands to show conditions and gear on button click', async () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    await userEvent.click(screen.getByRole('button', { name: /expand weather details/i }));
    expect(screen.getByText('Rain')).toBeInTheDocument();
    expect(screen.getByText('Flood risk')).toBeInTheDocument();
    expect(screen.getByText('Umbrella')).toBeInTheDocument();
    expect(screen.getByText('Raincoat')).toBeInTheDocument();
  });

  it('collapses again on second click', async () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    const btn = screen.getByRole('button', { name: /expand weather details/i });
    await userEvent.click(btn);
    expect(screen.getByText('Rain')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /collapse weather details/i }));
    expect(screen.queryByText('Rain')).not.toBeInTheDocument();
  });

  it('sets aria-expanded false when collapsed', () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    expect(screen.getByRole('button', { name: /expand weather details/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('sets aria-expanded true when expanded', async () => {
    render(<WeatherRiskBadge risk={HIGH_RISK} />);
    await userEvent.click(screen.getByRole('button', { name: /expand weather details/i }));
    expect(screen.getByRole('button', { name: /collapse weather details/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
