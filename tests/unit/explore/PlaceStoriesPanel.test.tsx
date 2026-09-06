import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaceStoriesPanel } from '@/components/explore/PlaceStoriesPanel';

describe('PlaceStoriesPanel', () => {
  it('renders a story picker and the first story by default', () => {
    render(<PlaceStoriesPanel />);
    expect(screen.getByLabelText(/place story/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ulsoor lake/i, level: 3 })).toBeInTheDocument();
  });

  it('switches stories when the picker changes', async () => {
    const user = userEvent.setup();
    render(<PlaceStoriesPanel />);

    await user.selectOptions(screen.getByLabelText(/place story/i), 'story-cubbon');
    expect(screen.getByRole('heading', { name: /cubbon park/i, level: 3 })).toBeInTheDocument();
  });
});
