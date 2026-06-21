import { render, screen } from '@testing-library/react';
import { Header } from '@/components/shell/Header';
import { vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

describe('Header', () => {
  it('renders the app name', () => {
    render(<Header />);
    expect(screen.getByText('Rain-N-Route')).toBeInTheDocument();
  });

  it('does not render a Dashboard link', () => {
    render(<Header />);
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
  });
});
