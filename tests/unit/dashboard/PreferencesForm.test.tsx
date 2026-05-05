import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PreferencesForm } from '@/components/dashboard/PreferencesForm';
import { usePreferencesStore } from '@/store/preferencesStore';

beforeEach(() => {
  usePreferencesStore.getState().reset();
});

describe('PreferencesForm', () => {
  it('reorders transport priority when arrows are clicked', () => {
    render(<PreferencesForm />);
    const initial = usePreferencesStore.getState().preferences.transportPriority;
    // Move the second item up
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Move ${initial[1]} up`, 'i') }));
    const next = usePreferencesStore.getState().preferences.transportPriority;
    expect(next[0]).toBe(initial[1]);
    expect(next[1]).toBe(initial[0]);
  });

  it('updates weather sensitivity', () => {
    render(<PreferencesForm />);
    fireEvent.click(screen.getByRole('button', { name: 'high' }));
    expect(usePreferencesStore.getState().preferences.weatherSensitivity).toBe('high');
  });

  it('reset returns to defaults', () => {
    usePreferencesStore.getState().set({ weatherSensitivity: 'high', defaultBufferMinutes: 30 });
    render(<PreferencesForm />);
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));
    expect(usePreferencesStore.getState().preferences.weatherSensitivity).toBe('medium');
    expect(usePreferencesStore.getState().preferences.defaultBufferMinutes).toBe(10);
  });
});
