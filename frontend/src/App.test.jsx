import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    // Add specific checks here based on what your App renders by default
    // e.g. expect(screen.getByText(/Havan Transit/i)).toBeInTheDocument();
  });
});
