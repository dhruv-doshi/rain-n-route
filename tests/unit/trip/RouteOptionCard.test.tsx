import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { RouteOptionCard } from '@/components/trip/RouteOptionCard';
import { MOCK_ROUTE_RESPONSE } from '@/services/maps/mock';

const CAR_ROUTE = MOCK_ROUTE_RESPONSE.routes[0];
const TRANSIT_ROUTE = MOCK_ROUTE_RESPONSE.routes[1];

describe('RouteOptionCard', () => {
  it('renders formatted duration', () => {
    render(<RouteOptionCard route={CAR_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('renders Free when estimatedCost is 0', () => {
    render(<RouteOptionCard route={CAR_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders cost in rupees for transit route', () => {
    render(<RouteOptionCard route={TRANSIT_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('₹45')).toBeInTheDocument();
  });

  it('renders Non-stop when numTransfers is 0', () => {
    render(<RouteOptionCard route={CAR_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Non-stop')).toBeInTheDocument();
  });

  it('renders transfer count for transit route', () => {
    render(<RouteOptionCard route={TRANSIT_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText(/1 transfer/)).toBeInTheDocument();
  });

  it('hides walk distance row when walkDistance is 0', () => {
    render(<RouteOptionCard route={CAR_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText('Walk')).not.toBeInTheDocument();
  });

  it('shows walk distance for transit route', () => {
    render(<RouteOptionCard route={TRANSIT_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Walk')).toBeInTheDocument();
    expect(screen.getByText('800 m')).toBeInTheDocument();
  });

  it('calls onSelect when Select button is clicked', async () => {
    const onSelect = vi.fn();
    render(<RouteOptionCard route={CAR_ROUTE} isSelected={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows Selected label and aria-pressed when isSelected', () => {
    render(<RouteOptionCard route={CAR_ROUTE} isSelected onSelect={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /selected/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render weather risk badge when weatherRisk is undefined', () => {
    render(<RouteOptionCard route={CAR_ROUTE} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText(/weather risk/i)).not.toBeInTheDocument();
  });

  it('applies ring class when selected', () => {
    const { container } = render(
      <RouteOptionCard route={CAR_ROUTE} isSelected onSelect={vi.fn()} />,
    );
    const card = container.querySelector('[data-slot="card"]');
    expect(card?.className).toContain('ring-brand');
  });
});
