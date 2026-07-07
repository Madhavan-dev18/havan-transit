// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SeatMap from './SeatMap';

describe('SeatMap Component', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    occupiedSeats: ['L-1A', 'R-2C'],
    selectedSeats: ['L-1B'],
    onSeatClick: vi.fn(),
  };

  it('renders correctly', () => {
    render(<SeatMap {...defaultProps} />);
    
    // Check if legends are rendered
    expect(screen.getByText('Available')).toBeDefined();
    expect(screen.getByText('Selected')).toBeDefined();
    expect(screen.getByText('Booked')).toBeDefined();

    // Check if seat 1A is booked and disabled
    const seat1A = screen.getByText('1A');
    expect(seat1A).toBeDefined();
    expect(seat1A.disabled).toBe(true);

    // Check if seat 1B is selected and not disabled
    const seat1B = screen.getByText('1B');
    expect(seat1B).toBeDefined();
    expect(seat1B.disabled).toBe(false);

    // Check if seat 2A is available and not disabled
    const seat2A = screen.getByText('2A');
    expect(seat2A).toBeDefined();
    expect(seat2A.disabled).toBe(false);
  });

  it('calls onSeatClick when an available seat is clicked', () => {
    render(<SeatMap {...defaultProps} />);
    const seat2A = screen.getByText('2A');
    fireEvent.click(seat2A);
    expect(defaultProps.onSeatClick).toHaveBeenCalledWith('L-2A');
  });

  it('does not call onSeatClick when a booked seat is clicked', () => {
    const onSeatClickMock = vi.fn();
    render(<SeatMap {...defaultProps} onSeatClick={onSeatClickMock} />);
    const seat1A = screen.getByText('1A');
    expect(seat1A.disabled).toBe(true);
    fireEvent.click(seat1A);
    expect(onSeatClickMock).not.toHaveBeenCalled();
  });
});
