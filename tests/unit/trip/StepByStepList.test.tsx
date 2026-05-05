import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { StepByStepList } from '@/components/trip/StepByStepList';
import { MOCK_ROUTE_RESPONSE } from '@/services/maps/mock';

const CAR_STEPS = MOCK_ROUTE_RESPONSE.routes[0].steps;
const TRANSIT_STEPS = MOCK_ROUTE_RESPONSE.routes[1].steps;

describe('StepByStepList', () => {
  it('is collapsed by default — shows expand button', () => {
    render(<StepByStepList steps={CAR_STEPS} />);
    expect(screen.getByText(/show \d+ step/i)).toBeInTheDocument();
    expect(screen.queryByText('Head south on 100 Feet Rd')).not.toBeInTheDocument();
  });

  it('expands to show all steps when button is clicked', async () => {
    render(<StepByStepList steps={CAR_STEPS} />);
    await userEvent.click(screen.getByText(/show \d+ step/i));
    expect(screen.getByText('Head south on 100 Feet Rd')).toBeInTheDocument();
    expect(screen.getByText('Turn right onto Outer Ring Rd')).toBeInTheDocument();
  });

  it('collapses back when clicked again', async () => {
    render(<StepByStepList steps={CAR_STEPS} />);
    await userEvent.click(screen.getByText(/show \d+ step/i));
    await userEvent.click(screen.getByText(/hide steps/i));
    expect(screen.queryByText('Head south on 100 Feet Rd')).not.toBeInTheDocument();
  });

  it('renders transit step with line and headsign', async () => {
    render(<StepByStepList steps={TRANSIT_STEPS} />);
    await userEvent.click(screen.getByText(/show \d+ step/i));
    // Transit info paragraph contains "Purple Line → Whitefield"
    const purpleLineEls = screen.getAllByText(/Purple Line/);
    expect(purpleLineEls.length).toBeGreaterThanOrEqual(1);
    const whitefieldEls = screen.getAllByText(/Whitefield/);
    expect(whitefieldEls.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render transit info for car steps', async () => {
    render(<StepByStepList steps={CAR_STEPS} />);
    await userEvent.click(screen.getByText(/show \d+ step/i));
    expect(screen.queryByText(/Purple Line/)).not.toBeInTheDocument();
  });

  it('renders nothing when steps array is empty', () => {
    const { container } = render(<StepByStepList steps={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
