import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { vi } from 'vitest';

const setTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme }),
}));

describe('ThemeToggle', () => {
  it('renders the dark-mode toggle button after mount', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it('calls setTheme("dark") when clicked in light mode', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    fireEvent.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
