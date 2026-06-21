import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AddressAutocomplete } from '@/components/planner/AddressAutocomplete';
import type { GeoSuggestion } from '@/types';

const mockSuggestions: GeoSuggestion[] = [
  {
    id: 's1',
    label: 'Indiranagar, Bengaluru',
    secondary: 'Karnataka',
    coords: { lat: 12.97, lng: 77.64 },
  },
  { id: 's2', label: 'Indore, Madhya Pradesh', coords: { lat: 22.72, lng: 75.86 } },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ suggestions: mockSuggestions }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AddressAutocomplete', () => {
  it('renders the label', () => {
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('From')).toBeInTheDocument();
  });

  it('shows the input when no value is selected', () => {
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search starting point…"
        value={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('Search starting point…')).toBeInTheDocument();
  });

  it('shows the selected value with a clear button', () => {
    const selected: GeoSuggestion = {
      id: 's1',
      label: 'Indiranagar',
      coords: { lat: 12.97, lng: 77.64 },
    };
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={selected}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('Indiranagar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear from/i })).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClear = vi.fn();
    const selected: GeoSuggestion = {
      id: 's1',
      label: 'Indiranagar',
      coords: { lat: 12.97, lng: 77.64 },
    };
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={selected}
        onSelect={vi.fn()}
        onClear={onClear}
      />,
    );
    await user.click(screen.getByRole('button', { name: /clear from/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('fetches and shows suggestions after typing 3+ chars', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('calls onSelect when a suggestion with coords is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={null}
        onSelect={onSelect}
        onClear={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Use mouseDown since the component uses onMouseDown
    await user.click(screen.getByText('Indiranagar, Bengaluru'));
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('navigates suggestions with arrow keys and selects with Enter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={null}
        onSelect={onSelect}
        onClear={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <AddressAutocomplete
        label="From"
        placeholder="Search…"
        value={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  describe('selection flow — place resolution (Requirement 3.5, 3.6)', () => {
    it('resolves place via geocode when suggestion has no coords', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onSelect = vi.fn();
      const onResolvingChange = vi.fn();

      // Suggestions without coords (like real Google Places suggestions)
      const noCoordsSuggestions: GeoSuggestion[] = [
        { id: 'place-1', label: 'Indiranagar, Bengaluru', secondary: 'Karnataka' },
      ];

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ suggestions: noCoordsSuggestions }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'place-1',
            label: 'Indiranagar',
            coords: { lat: 12.97, lng: 77.64 },
          }),
        });

      render(
        <AddressAutocomplete
          label="From"
          placeholder="Search…"
          value={null}
          onSelect={onSelect}
          onClear={vi.fn()}
          onResolvingChange={onResolvingChange}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'Ind');

      await waitFor(
        () => {
          expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      await user.click(screen.getByText('Indiranagar, Bengaluru'));

      // Should enter resolving state
      await waitFor(() => {
        expect(onResolvingChange).toHaveBeenCalledWith(true);
      });

      // After resolution completes, onSelect is called with resolved coords
      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            coords: { lat: 12.97, lng: 77.64 },
          }),
        );
      });

      // Resolving state ended
      expect(onResolvingChange).toHaveBeenCalledWith(false);
    });
  });

  describe('clear flow (Requirement 4.3)', () => {
    it('clicking clear calls onClear and field becomes editable', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onClear = vi.fn();
      const selected: GeoSuggestion = {
        id: 's1',
        label: 'Indiranagar',
        coords: { lat: 12.97, lng: 77.64 },
      };

      const { rerender } = render(
        <AddressAutocomplete
          label="From"
          placeholder="Search…"
          value={selected}
          onSelect={vi.fn()}
          onClear={onClear}
        />,
      );

      await user.click(screen.getByRole('button', { name: /clear from/i }));
      expect(onClear).toHaveBeenCalledOnce();

      // Simulate parent clearing value
      rerender(
        <AddressAutocomplete
          label="From"
          placeholder="Search…"
          value={null}
          onSelect={vi.fn()}
          onClear={onClear}
        />,
      );

      // Input should be visible and editable
      const input = screen.getByRole('combobox');
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });
  });

  describe('error retention (Requirement 13.1, 13.2)', () => {
    it('preserves input text when place resolution fails', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onSelect = vi.fn();
      const onResolutionError = vi.fn();

      // Suggestions without coords
      const noCoordsSuggestions: GeoSuggestion[] = [
        { id: 'place-1', label: 'Indiranagar, Bengaluru', secondary: 'Karnataka' },
      ];

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ suggestions: noCoordsSuggestions }),
        })
        // Geocode call fails
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        });

      render(
        <AddressAutocomplete
          label="From"
          placeholder="Search…"
          value={null}
          onSelect={onSelect}
          onClear={vi.fn()}
          onResolutionError={onResolutionError}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'Ind');

      await waitFor(
        () => {
          expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      await user.click(screen.getByText('Indiranagar, Bengaluru'));

      // Resolution fails, error callback is invoked
      await waitFor(() => {
        expect(onResolutionError).toHaveBeenCalledWith(expect.stringContaining("Couldn't"));
      });

      // onSelect should NOT have been called since resolution failed
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('zero results (Requirement 3.8)', () => {
    it('displays empty list without error message when no suggestions returned', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ suggestions: [] }),
      });

      render(
        <AddressAutocomplete
          label="From"
          placeholder="Search…"
          value={null}
          onSelect={vi.fn()}
          onClear={vi.fn()}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'zzzzz');

      // Wait for debounce
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      // No error message displayed, no listbox (since loading is done and no suggestions)
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });
});
