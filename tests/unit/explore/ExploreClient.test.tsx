import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExploreClient } from '@/components/explore/ExploreClient';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('ExploreClient', () => {
  it('renders topic selector and disclaimer', async () => {
    render(<ExploreClient />);
    expect(screen.getByRole('heading', { name: /explore bengaluru/i })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/indicative public maps/i);
    expect(screen.getByLabelText(/what to explore/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search places/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /rainy-day commute/i })).toBeInTheDocument();
  });

  it('honours initialTopicId prop', () => {
    render(<ExploreClient initialTopicId="transit" />);
    expect(screen.getByLabelText(/what to explore/i)).toHaveValue('transit');
  });

  it('shows Google Maps fallback when keys are not configured', () => {
    render(<ExploreClient />);
    expect(screen.getByText(/map requires google maps/i)).toBeInTheDocument();
  });

  it('shows place stories panel only for the stories topic', async () => {
    const user = userEvent.setup();
    render(<ExploreClient />);
    expect(screen.queryByLabelText(/place story/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/what to explore/i), 'stories');
    expect(screen.getByLabelText(/place story/i)).toBeInTheDocument();
  });

  it('updates the topic summary when selection changes', async () => {
    const user = userEvent.setup();
    render(<ExploreClient />);
    expect(screen.getByText(/bbmp flood-prone points and low-lying pockets/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/what to explore/i), 'transit');
    expect(
      screen.getByText(/namma metro stations and major bmtc interchanges/i),
    ).toBeInTheDocument();
  });

  it('reveals optional layer toggles', async () => {
    const user = userEvent.setup();
    render(<ExploreClient />);
    expect(screen.queryByRole('button', { name: /valley systems/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^layers$/i }));
    expect(screen.getByRole('button', { name: /valley systems/i })).toBeInTheDocument();
  });

  it('toggles topic layer chips off and on', async () => {
    const user = userEvent.setup();
    render(<ExploreClient initialTopicId="flood_risk" />);

    const floodChip = screen.getByRole('button', { name: /hide flood-prone points/i });
    await user.click(floodChip);
    expect(screen.getByRole('button', { name: /show flood-prone points/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show flood-prone points/i }));
    expect(screen.getByRole('button', { name: /hide flood-prone points/i })).toBeInTheDocument();
  });
});
