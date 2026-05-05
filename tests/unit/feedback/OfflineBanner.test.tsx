import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';

describe('OfflineBanner', () => {
  const originalOnline = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');

  afterEach(() => {
    if (originalOnline) {
      Object.defineProperty(window.navigator, 'onLine', originalOnline);
    }
  });

  it('renders nothing when online', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.queryByText(/you're offline/i)).toBeNull();
  });

  it('shows offline message when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it('hides banner when going back online', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    await act(async () => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByText(/you're offline/i)).toBeNull();
  });
});
