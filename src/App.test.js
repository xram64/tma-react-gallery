import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the global `fetch` function (not supported in `jsdom` test environment)
// This will simulate an S3 bucket `fetch` by returning a single `<Contents>` element to `useGetS3Objects`.
global.fetch = jest.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve(`
      <?xml version="1.0" encoding="UTF-8"?>
      <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <Name>tma-meetup-kushoglake-2022</Name>
      <Contents>
        <Key>images/20220101_101010_Name.jpg</Key>
        <Size>999999</Size>
      </Contents>
      </ListBucketResult>
    `),
  })
);

// Clear all mock functions after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Run tests
test('quick test', () => {
  render(<App />);
  const loading = screen.getByText(/Loading.../i);
  expect(loading).toBeInTheDocument();
});



