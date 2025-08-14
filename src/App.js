/* React */
import React from 'react';
import { RouterProvider, createBrowserRouter, Outlet, Link, useNavigation } from 'react-router-dom';
import GalleryContainer, { galleryLoader } from './GalleryContainer';
import ErrorPage from './ErrorPage';

import imgBG from './img/tma-bg.png';

import './App.css';

/* AWS */
export const S3BucketParams = [
  { id: 1, galleryPath: "KushogLake2022", bucketName: "tma-meetup-kushoglake-2022", region: "us-east-1", label_title: "Kushog Lake", label_year: "2022" },
  { id: 2, galleryPath: "BuckHouse2023", bucketName: "tma-meetup-buckhouse-2023", region: "us-east-1", label_title: "Buck House", label_year: "2023" },
  { id: 3, galleryPath: "SplashHouse2024", bucketName: "tma-meetup-splashhouse-2024", region: "us-east-1", label_title: "Splash House", label_year: "2024" },
  { id: 4, galleryPath: "HMSFireball2025", bucketName: "tma-meetup-hmsfireball-2025", region: "us-east-1", label_title: "HMS Fireball", label_year: "2025" },
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
    <div className="Index" style={{ backgroundImage: `url(${imgBG})` }}>
      {/* Basic listing of available gallery S3 buckets. */}
      <h1 className="Index-header">TMA Meetups</h1>
      <div className="Index-list">
        {S3BucketParams.map((bucket) => (
          <Link className="Index-list-item" to={bucket.galleryPath} key={bucket.id}>
            <button className="Index-list-item-btn">
              <div className="Index-list-item-year">{bucket.label_year}</div>{bucket.label_title}
            </button>
          </Link>
        ))}
      </div>
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