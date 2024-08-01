/* React */
import React from 'react';
import { RouterProvider, createBrowserRouter, Outlet, Link, useNavigation } from 'react-router-dom';
import GalleryContainer, { galleryLoader } from './GalleryContainer';
import ErrorPage from './ErrorPage';

import './App.css';

/* AWS */
export const S3BucketParams = [
  { id: 1, galleryPath: "KushogLake2022", bucketName: "tma-meetup-kushoglake-2022", region: "us-east-1", label: "[2022] Kushog Lake" },
  { id: 2, galleryPath: "BuckHouse2023", bucketName: "tma-meetup-buckhouse-2023", region: "us-east-1", label: "[2023] Buck House" },
  { id: 3, galleryPath: "SplashHouse2024", bucketName: "tma-meetup-splashhouse-2024", region: "us-east-1", label: "[2024] Splash House" },
];

//┣━━━━━━━━━━━━━━━━┓
//┃  Route Config  ┃
//┣━━━━━━━━━━━━━━━━┛

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        // Pathless route for inline error page
        errorElement: <ErrorPage />,

        // Content routes
        children: [
          {
            index: true,
            element: <Index />,
          },
          {
            // Uses a 'dynamic segment' [https://reactrouter.com/en/main/start/overview#dynamic-segments]
            // When a `/galleryPath` is appended to the URL, `galleryPath` is passed into the `galleryLoader` (defined in Gallery.js).
            //   The loader will then receive and handle the `galleryPath` string param before loading the `GalleryContainer` component.
            path: ":galleryPath",
            element: <GalleryContainer />,
            loader: galleryLoader,
          },
        ],

      }
    ],
  },
]);

//┣━━━━━━━━━━━━━━━━━━━━━┓
//┃   Index Component   ┃
//┣━━━━━━━━━━━━━━━━━━━━━┛
export function Index() {
  return (
    // TODO: Add styling for the index page/links
    <div className="Index">
      {/* Basic listing of available gallery S3 buckets. */}
      <h1 className="Index-header">TMA Meetups</h1>
      <ul className="Index-list">
        {S3BucketParams.map((bucket) => (
          <li key={bucket.id} className="Index-list-item">
            <Link className="Index-list-item-link" to={bucket.galleryPath}>{bucket.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

//┣━━━━━━━━━━━━━━━━━━━━┓
//┃   Root Component   ┃
//┣━━━━━━━━━━━━━━━━━━━━┛
export function Root() {
  const navigation = useNavigation();

  return (
    <div className={`Root${navigation.state === "loading" ? " loading" : ""}`}>
      <Outlet />
    </div>
  );
}

//┣━━━━━━━━━━━━━━━━━━━┓
//┃   App Component   ┃
//┣━━━━━━━━━━━━━━━━━━━┛
export default function App() {
  return (
    <RouterProvider router={router} />
  );
}