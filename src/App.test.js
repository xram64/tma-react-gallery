import { render, screen } from '@testing-library/react';
import App from './App';

test('quick test', () => {
  render(<App />);
  const loading = screen.getByText(/Loading.../i);
  expect(loading).toBeInTheDocument();
});
