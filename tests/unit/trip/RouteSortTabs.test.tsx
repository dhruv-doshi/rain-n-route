import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { RouteSortTabs } from '@/components/trip/RouteSortTabs';

// Each tab renders two spans (sm:hidden + hidden sm:inline) for responsive labels.
// In jsdom all spans are visible, so we query by role to avoid duplicate-text errors.
function getTab(name: RegExp | string) {
  return screen.getAllByRole('tab').find((el) => el.textContent?.match(name))!;
}

describe('RouteSortTabs', () => {
  it('renders all four tabs', () => {
    render(<RouteSortTabs sortBy="fastest" onChange={vi.fn()} />);
    expect(getTab(/fastest/i)).toBeDefined();
    expect(getTab(/cheapest/i)).toBeDefined();
    expect(getTab(/fewest/i)).toBeDefined();
    expect(getTab(/eco/i)).toBeDefined();
  });

  it('calls onChange with the correct SortMode when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(<RouteSortTabs sortBy="fastest" onChange={onChange} />);
    await userEvent.click(getTab(/cheapest/i));
    expect(onChange).toHaveBeenCalledWith('cheapest');
  });

  it('calls onChange with eco when Eco tab is clicked', async () => {
    const onChange = vi.fn();
    render(<RouteSortTabs sortBy="fastest" onChange={onChange} />);
    await userEvent.click(getTab(/eco/i));
    expect(onChange).toHaveBeenCalledWith('eco');
  });

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn();
    render(<RouteSortTabs sortBy="fastest" onChange={onChange} disabled />);
    await userEvent.click(getTab(/cheapest/i));
    expect(onChange).not.toHaveBeenCalled();
  });
});
