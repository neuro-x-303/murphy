import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Mock WebGL Hyperspeed background component to prevent JSDOM errors during testing
jest.mock('./Hyperspeed', () => {
  return function MockHyperspeed() {
    return <div data-testid="hyperspeed-mock">Mocked Hyperspeed</div>;
  };
});

test('renders without crashing', () => {
  const div = document.createElement('div');
  const root = createRoot(div);
  root.render(<App />);
  root.unmount();
});
