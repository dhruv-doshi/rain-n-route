import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExploreClient } from '@/components/explore/ExploreClient';

describe('ExploreClient', () => {
  it('renders topic selector and disclaimer', async () => {
    render(<ExploreClient />);
    expect(screen.getByRole('heading', { name: /explore bengaluru/i })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/indicative public maps/i);
    expect(screen.getByLabelText(/what to explore/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /flood & waterlogging/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /monsoon hazard map/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /metro & bmtc hubs/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /commute escape routes/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /place stories/i })).toBeInTheDocument();
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
});
