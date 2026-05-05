import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FromToForm } from '@/components/planner/FromToForm';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  writable: true,
  value: { getCurrentPosition: vi.fn() },
});

const SUGGESTIONS = [
  {
    id: 's1',
    label: 'Indiranagar, Bengaluru',
    secondary: 'Karnataka',
    coords: { lat: 12.97, lng: 77.64 },
  },
  {
    id: 's2',
    label: 'Whitefield, Bengaluru',
    secondary: 'Karnataka',
    coords: { lat: 12.97, lng: 77.74 },
  },
];

beforeEach(() => {
  mockPush.mockReset();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ suggestions: SUGGESTIONS }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FromToForm', () => {
  it('renders From and To labels', () => {
    render(<FromToForm />);
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
  });

  it('renders the Plan my trip submit button', () => {
    render(<FromToForm />);
    expect(screen.getByRole('button', { name: /plan my trip/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitted without selections', async () => {
    render(<FromToForm />);
    await userEvent.click(screen.getByRole('button', { name: /plan my trip/i }));
    const errors = screen.getAllByText('Please select a location');
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to /trip/plan when both fields are filled', async () => {
    render(<FromToForm />);

    // Fill From
    const [fromInput, toInput] = screen.getAllByRole('combobox');
    await userEvent.type(fromInput, 'Ind');
    await waitFor(() => screen.getByText('Indiranagar, Bengaluru'), { timeout: 1000 });
    await userEvent.click(screen.getByText('Indiranagar, Bengaluru'));

    // Fill To
    await userEvent.type(toInput, 'Whi');
    await waitFor(() => screen.getByText('Whitefield, Bengaluru'), { timeout: 1000 });
    await userEvent.click(screen.getByText('Whitefield, Bengaluru'));

    await userEvent.click(screen.getByRole('button', { name: /plan my trip/i }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/trip/plan'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('from='));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('to='));
  });

  it('shows a swap button that swaps from and to values', async () => {
    render(<FromToForm />);

    // Fill From
    const [fromInput, toInput] = screen.getAllByRole('combobox');
    await userEvent.type(fromInput, 'Ind');
    await waitFor(() => screen.getByText('Indiranagar, Bengaluru'), { timeout: 1000 });
    await userEvent.click(screen.getByText('Indiranagar, Bengaluru'));

    // Fill To
    await userEvent.type(toInput, 'Whi');
    await waitFor(() => screen.getByText('Whitefield, Bengaluru'), { timeout: 1000 });
    await userEvent.click(screen.getByText('Whitefield, Bengaluru'));

    // Swap
    await userEvent.click(screen.getByRole('button', { name: /swap from and to/i }));

    // After swap, From should show Whitefield and To should show Indiranagar
    expect(screen.getByText('Whitefield, Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
  });
});
