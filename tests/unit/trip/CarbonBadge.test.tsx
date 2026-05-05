import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CarbonBadge } from '@/components/trip/CarbonBadge';

describe('CarbonBadge', () => {
  it('renders nothing when carbonGrams is 0', () => {
    const { container } = render(<CarbonBadge carbonGrams={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows grams under 1 kg', () => {
    render(<CarbonBadge carbonGrams={300} />);
    expect(screen.getByText(/300 g CO/)).toBeTruthy();
  });

  it('shows kg over 1 kg with one decimal', () => {
    render(<CarbonBadge carbonGrams={2_875} />);
    expect(screen.getByText(/2\.9 kg CO/)).toBeTruthy();
  });
});
