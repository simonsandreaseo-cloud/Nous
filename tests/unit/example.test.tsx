import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// A simple component to test the setup
const Welcome = () => <h1>Welcome to Nous 2.0</h1>;

describe('Welcome Component', () => {
  it('renders the welcome message', () => {
    render(<Welcome />);
    expect(screen.getByText(/Welcome to Nous 2.0/i)).toBeInTheDocument();
  });
});
