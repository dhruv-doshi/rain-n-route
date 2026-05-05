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
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ suggestions: mockSuggestions }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
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
    await userEvent.click(screen.getByRole('button', { name: /clear from/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('fetches and shows suggestions after typing 2+ chars', async () => {
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
    await userEvent.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('calls onSelect when a suggestion is clicked', async () => {
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
    await userEvent.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await userEvent.click(screen.getByText('Indiranagar, Bengaluru'));
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('navigates suggestions with arrow keys and selects with Enter', async () => {
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
    await userEvent.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('closes dropdown on Escape', async () => {
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
    await userEvent.type(input, 'Ind');

    await waitFor(
      () => {
        expect(screen.getByText('Indiranagar, Bengaluru')).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
