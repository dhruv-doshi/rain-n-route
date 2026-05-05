import { render, screen } from '@testing-library/react';
import { Header } from '@/components/shell/Header';
import { vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

describe('Header', () => {
  it('renders the app name', () => {
    render(<Header />);
    expect(screen.getByText('CommuteWise')).toBeInTheDocument();
  });

  it('has a link to the dashboard', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });
});
