import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Utils from './utils.js';

import imgDownload from './img/download-white.png';
import imgNewtab from './img/newtab-white.png';

/*  ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
 *  • Layout
 *    - Header with toggle for image/video modes, navigation buttons, and media detail
 *    - Full-window image/video view
 *
 *  • TODO:
 *    (•) Show a loading spinner during loading of each image/video
 *    (•) Add a thumbnail row along the bottom (pre-generate thumbnails for each picture -- using AWS Lambda fns?).
 *    (•) Add (pop-out?) list view for images/videos in bucket.
 *    (•) Add sorting options/controls.
 *    (•) Add an info icon to show tooltip in mouseover (keyboard shortcuts, etc).
 *    (?) Set cookie to remember last image/video position.
 * 
 *  ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
*/

//┣━━━━━━━━━━━━━━━━┓
//┃   Components   ┃
//┣━━━━━━━━━━━━━━━━┛

export default function Gallery(props) {
  // [Update triggers]
  // - User navigates to a different photo/video
  // - User switches between photo/video modes using a MenuButton

  // [State]
  // - Gallery will receive events from the Header component when the user clicks a "mode" MenuButton.
  // - Gallery will also receive events from the Navigation component when the user navigates to a different 
  //    image/video (changing the current image/video).
  // - Both of these events will change the state of the Gallery component, with new data passed down 
  //    to 'Display' and 'Details' as props.

  // These will only change when the gallery is changed and a new S3 bucket is loaded.
  const [imagesList, setImagesList] = useState([]);
  const [videosList, setVideosList] = useState([]);

  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('images');
  const [currentMedia, setCurrentMedia] = useState({ src: null, filename: null, datestamp: null, timestamp: null, credit: null });
  const [currentIndex, setCurrentIndex] = useState({ image: -1, video: -1 });
  // const [currentSort, setCurrentSort] = useState({ type: 'default', dir: 'ascending' });    // TODO: Implement sorting options, and move sort logic out of `utils.js`

  const s3_objects = useGetS3Objects(props.endpointDomain, props.accessKey);  // Custom hook: Get list of S3 objects from bucket

  /// [Gallery — Initialization] ///

  // Get image/video lists from S3 bucket
  useEffect(() => {
    if (s3_objects.list) {
      var [images_list, videos_list] = Utils.parseBucketFileList(s3_objects.list, props.endpointDomain);
      setImagesList(images_list);
      setVideosList(videos_list);
    }
  }, [s3_objects]);  // Only run when 's3_objects' changes

  // Initialize defaults for each media type
  useEffect(() => {
    if (imagesList.length > 0 && videosList.length > 0) {  // make sure file list has been loaded
      // Default to 'images' mode showing the first image, unless a fragment is provided in the URL (format: 'images-0' or 'videos-0')
      if (window.location.hash.includes('#') && window.location.hash.length > 1) {
        try {
          let h_mode = window.location.hash.split('#')[1].split('-')[0];
          let h_index = window.location.hash.split('#')[1].split('-')[1];
          h_index = parseInt(h_index) - 1;  // the fragment index is 1-indexed, so shift to get the array index

          // Check for valid mode and index, fail if invalid
          if (h_mode !== 'images' && h_mode !== 'videos') throw new Error("Invalid mode in URL fragment.");
          if (Number.isNaN(Number.parseInt(h_index))) throw new Error("Invalid index in URL fragment.");
          if (h_mode === 'images' && (h_index < 0 || h_index >= imagesList.length)) throw new Error("Out-of-bounds index in URL fragment.");
          if (h_mode === 'videos' && (h_index < 0 || h_index >= videosList.length)) throw new Error("Out-of-bounds index in URL fragment.");

          // For a valid mode and index, set the defaults accordingly
          let h_media = (h_mode === 'images' ? imagesList[h_index] : videosList[h_index]);
          setCurrentMedia({
            src: h_media.src,
            filename: h_media.filename,
            datestamp: h_media.datestamp,
            timestamp: h_media.timestamp,
            credit: h_media.credit
          });
          if (h_mode === 'images') {
            setMode('images');
            setCurrentIndex({ image: h_index, video: 0 });
          }
          if (h_mode === 'videos') {
            setMode('videos');
            setCurrentIndex({ image: 0, video: h_index });
          }
        }
        catch (err) {
          console.log("[ERROR] " + err);
          // Fallback to defaults if URL fragment is malformed  // DRY
          setCurrentMedia({
            src: imagesList[0].src,
            filename: imagesList[0].filename,
            datestamp: imagesList[0].datestamp,
            timestamp: imagesList[0].timestamp,
            credit: imagesList[0].credit
          });
          setCurrentIndex({ image: 0, video: 0 });
          // Clear the URL fragment (leaves the #)
          window.location.hash = '';
        }
      }
      else {
        // Defaults (if no URL fragment is provided)  // DRY
        setCurrentMedia({
          src: imagesList[0].src,
          filename: imagesList[0].filename,
          datestamp: imagesList[0].datestamp,
          timestamp: imagesList[0].timestamp,
          credit: imagesList[0].credit
        });
        setCurrentIndex({ image: 0, video: 0 });
      }
    }
  }, [imagesList, videosList]);  // Only run when 'imagesList' or 'videoList' changes

  // Set 'ready' flag once all state variables have been initialized.
  useEffect(() => {
    if (!ready && imagesList.length > 0 && videosList.length > 0 && currentMedia.src !== null && currentIndex.image > -1 && currentIndex.video > -1) {
      setReady(true);
    }
  });

  // Arrow key event handler, utilizing useCallback so the reference never changes.
  const navKeyHandler = useCallback(
    (event) => {
      if (ready) {
        let n_index = (mode === 'images') ? currentIndex.image : currentIndex.video;
        let n_maxindex = (mode === 'images') ? imagesList.length - 1 : videosList.length - 1;

        // Check for navigation keys
        switch (event.key) {
          // Back 1
          case "ArrowLeft":
          case "ArrowUp":
            n_index -= 1;
            if (n_index < 0) { n_index = 0; }
            break;
          // Forward 1
          case "ArrowRight":
          case "ArrowDown":
            n_index += 1;
            if (n_index > n_maxindex) { n_index = n_maxindex; }
            break;
          // Back 10
          case "PageUp":
            n_index -= 10;
            if (n_index < 0) { n_index = 0; }
            break;
          // Forward 10
          case "PageDown":
            n_index += 10;
            if (n_index > n_maxindex) { n_index = n_maxindex; }
            break;
          // Back to start
          case "Home":
            n_index = 0;
            break;
          // Forward to end
          case "End":
            n_index = n_maxindex;
            break;
          // Toggle mode
          case "m":
            setMode((mode === 'images') ? 'videos' : 'images');
            break;
          default:
            break;
        }

        // Update media
        if (mode === 'images')
          setCurrentIndex({ image: n_index, video: currentIndex.video });
        else if (mode === 'videos')
          setCurrentIndex({ image: currentIndex.image, video: n_index });
      }
    }, [currentIndex, setCurrentIndex, imagesList, videosList, mode, ready]
  );
  // Add event listener for the arrow key event handler, using our custom hook
  useEventListener("keydown", navKeyHandler);

  // Callback for the 'useHorizonalSwipeHandler' custom hook to update the current media index on a valid swipe
  const navSwipeHandler = useCallback(
    (change_to_index) => {
      if (ready) {
        let n_index = (mode === 'images') ? currentIndex.image : currentIndex.video;
        let n_maxindex = (mode === 'images') ? imagesList.length - 1 : videosList.length - 1;

        if (!change_to_index) return;  // if no index change is provided, do nothing

        // Update index in direction of swipe
        n_index += change_to_index;  // +1 (forward) or -1 (back)

        if (n_index < 0 || n_index > n_maxindex) return;  // if new index is out of bounds, do nothing
        else {
          // Update media
          if (mode === 'images')
            setCurrentIndex({ image: n_index, video: currentIndex.video });
          else if (mode === 'videos')
            setCurrentIndex({ image: currentIndex.image, video: n_index });
          return;
        }
      }
    }, [currentIndex, setCurrentIndex, imagesList, videosList, mode, ready]
  );
  // Add event listeners for the swipe event handler, through our custom hook
  useHorizonalSwipeNav(navSwipeHandler);


  /// [Gallery — Rendering] ///

  // Update on changes to 'currentIndex' or 'mode'
  useEffect(() => {
    if (ready) {
      // console.log("[DEBUG] currentMedia.src: " + currentMedia.src + " | currentIndex.image: " + currentIndex.image + " | currentIndex.video: " + currentIndex.video);

      if (mode === 'images') {
        setCurrentMedia({
          src: imagesList[currentIndex.image].src,
          filename: imagesList[currentIndex.image].filename,
          datestamp: imagesList[currentIndex.image].datestamp,
          timestamp: imagesList[currentIndex.image].timestamp,
          credit: imagesList[currentIndex.image].credit
        });
      }

      else if (mode === 'videos') {
        setCurrentMedia({
          src: videosList[currentIndex.video].src,
          filename: videosList[currentIndex.video].filename,
          datestamp: videosList[currentIndex.video].datestamp,
          timestamp: videosList[currentIndex.video].timestamp,
          credit: videosList[currentIndex.video].credit
        });
      }
    }
  }, [currentIndex, mode]);


  // If the list is ready
  if (ready) {
    // Convert raw filename values for `datestamp`, `timestamp`, and `credit` into formatted strings for display.
    var mediaDetails = Utils.parseDetails(currentMedia.datestamp, currentMedia.timestamp, currentMedia.credit);

    return (
      <div className="Gallery" id={"g_" + mode}>

        <Header
          mode={mode}
          setMode={setMode}
          imagesListLength={imagesList.length}
          videosListLength={videosList.length}
          currentMedia={currentMedia}
          setCurrentMedia={setCurrentMedia}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          mediaDetails={mediaDetails}
          accessKey={props.accessKey}
        />

        <Display mode={mode} currentMedia={currentMedia} mediaDetails={mediaDetails} accessKey={props.accessKey} />

      </div>
    );
  }

  // If the list is not ready
  else {
    return (
      <div className="Gallery-loading">
        <div className="Gallery-loading-text">
          Loading...
        </div>

        {s3_objects.error &&
          <div className='Gallery-error-text'>
            {"Error: " + s3_objects.error};
          </div>
        }
      </div>
    );
  }
}


function Header(props) {
  return (
    <div className="header">

      <div className="header-menu">
        <MenuButton label="Photos" cls={(props.mode === 'images') ? "active" : ""} onClick={() => props.setMode('images')} />
        <MenuButton label="Videos" cls={(props.mode === 'videos') ? "active" : ""} onClick={() => props.setMode('videos')} />

        <div className="header-menu-utils">
          <NewtabButton mode={props.mode} currentMedia={props.currentMedia} accessKey={props.accessKey} />
          <DownloadButton mode={props.mode} currentMedia={props.currentMedia} accessKey={props.accessKey} />
        </div>
      </div>


      <Navigation
        mode={props.mode}
        imagesListLength={props.imagesListLength}
        videosListLength={props.videosListLength}
        currentIndex={props.currentIndex}
        setCurrentIndex={props.setCurrentIndex}
      />

      <Details mode={props.mode} currentMedia={props.currentMedia} mediaDetails={props.mediaDetails} />

    </div>
  );
}

function MenuButton(props) {
  return (
    <a className={"header-menu-btn" + " " + props.cls} name={"menubtn" + props.label} onClick={() => { props.onClick(); }}>
      {props.label}
    </a>
  );
}

function Navigation(props) {
  const [navButtonCount, setNavButtonCount] = useState(5);

  // One-shot effects to set up adjustments to window length based on viewport width.
  // [Ref: https://blog.bitsrc.io/using-react-hooks-to-recognize-respond-to-current-viewport-size-c385009005c0]
  useEffect(() => {  // set initial 'navButtonCount'
    if (window.innerWidth < 480)
      setNavButtonCount(1);
    else if (window.innerWidth < 768)
      setNavButtonCount(3);
    else
      setNavButtonCount(5);
  }, []);
  useEffect(() => {  // adjust 'navButtonCount' on window resize
    const onResize = () => {
      if (window.innerWidth < 480)
        setNavButtonCount(1);
      else if (window.innerWidth < 768)
        setNavButtonCount(3);
      else
        setNavButtonCount(5);
    };
    window.addEventListener('resize', onResize);  // set event listener for window size changes
    return () => { window.removeEventListener('resize', onResize); }  // clean up
  }, []);

  // Change URL fragment (#) on navigation.
  // TODO: Change this to use the `useNavigation` hook from react-router-dom instead? [https://reactrouter.com/en/main/hooks/use-navigate]
  useEffect(() => {
    if (props.currentIndex.image >= 0 && props.currentIndex.video >= 0) {
      let h_index = (props.mode === 'images' ? props.currentIndex.image : props.currentIndex.video);
      window.location.hash = "#" + props.mode + "-" + (Number.parseInt(h_index) + 1);
    }
  }, [props.currentIndex, props.mode]);


  var center = 0, maxIndex = 0;
  if (props.mode === 'images') {
    center = props.currentIndex.image;
    maxIndex = props.imagesListLength - 1;
  }
  else if (props.mode === 'videos') {
    center = props.currentIndex.video;
    maxIndex = props.videosListLength - 1;
  }

  return (
    <div className="header-nav">

      {/*  First button  */}
      <NavButton label="<<" desc="first" cls="first-last" onClick={() => {
        if (props.mode === 'images')
          props.setCurrentIndex({ image: 0, video: props.currentIndex.video });
        else if (props.mode === 'videos')
          props.setCurrentIndex({ video: 0, image: props.currentIndex.image });
      }} />

      {/*  Previous button  */}
      <NavButton label="<" desc="previous" cls="prev-next" onClick={() => {
        if (props.mode === 'images')
          props.setCurrentIndex({ image: Utils.decrementWithClamp(props.currentIndex.image, 0), video: props.currentIndex.video });
        else if (props.mode === 'videos')
          props.setCurrentIndex({ video: Utils.decrementWithClamp(props.currentIndex.video, 0), image: props.currentIndex.image });
      }} />

      {/*  Numbered buttons  */}
      {Utils.centeredIndexSequence(center, navButtonCount, 0, maxIndex).map((i) =>
        <NavButton key={i.toString()} label={(i + 1).toString()} desc={"item-" + (i + 1).toString()} cls={(i == center) ? "number active" : "number"} onClick={() => {
          if (props.mode === 'images')
            props.setCurrentIndex({ image: i, video: props.currentIndex.video });
          else if (props.mode === 'videos')
            props.setCurrentIndex({ image: props.currentIndex.image, video: i });
        }} />
      )}

      {/*  Next button  */}
      <NavButton label=">" desc="next" cls="prev-next" onClick={() => {
        if (props.mode === 'images')
          props.setCurrentIndex({ image: Utils.incrementWithClamp(props.currentIndex.image, props.imagesListLength - 1), video: props.currentIndex.video });
        else if (props.mode === 'videos')
          props.setCurrentIndex({ video: Utils.incrementWithClamp(props.currentIndex.video, props.videosListLength - 1), image: props.currentIndex.image });
      }} />

      {/*  Last button  */}
      <NavButton label=">>" desc="last" cls="first-last" onClick={() => {
        if (props.mode === 'images')
          props.setCurrentIndex({ image: props.imagesListLength - 1, video: props.currentIndex.video });
        else if (props.mode === 'videos')
          props.setCurrentIndex({ video: props.videosListLength - 1, image: props.currentIndex.image });
      }} />

    </div>
  );
}

function NavButton(props) {
  return (
    <a className={"header-nav-btn" + " " + props.cls} id={"navbtn_" + props.desc} onClick={() => { props.onClick(); }}>
      {props.label}
    </a>
  );
}


function Details(props) {
  return (
    <div className="header-details" id={"g_" + props.mode + "_details"}>
      <div className="header-details-date">{props.mediaDetails.date}</div>
      <div className="header-details-time">{props.mediaDetails.time}</div>
      <div className="header-details-credit">{props.mediaDetails.credit}</div>
    </div>
  );
}


function NewtabButton(props) {
  return (
    <div className="header-util" id={"g_" + props.mode + "_newtab"}>
      <button
        className="header-util-btn"
        title={"Open " + (props.mode == "images" ? "photo" : "video" ) + " in a new tab"}
        onClick={() => { window.open(props.currentMedia.src + "?key=" + btoa(props.accessKey), "_blank"); }}
      >
        <img src={imgNewtab} className="header-util-icon" />
      </button>
    </div>
  )
}

function DownloadButton(props) {
  return (
    <div className="header-util" id={"g_" + props.mode + "_download"}>
      <button
        className="header-util-btn"
        title={"Download this " + (props.mode == "images" ? "photo" : "video" )}
        onClick={() => { Utils.downloadMediaViaBlob(props.currentMedia.src + "?key=" + btoa(props.accessKey), props.currentMedia.filename); }}
      >
        <img src={imgDownload} className="header-util-icon" />
      </button>
    </div>
  )
}


function Display(props) {
  // Gallery should pass down the photo/video to this component as a prop.

  var mediaTag = null;

  // Setup photo
  if (props.mode === 'images') {
    mediaTag = <img
      src={props.currentMedia.src + "?key=" + btoa(props.accessKey)}  // Submit base64-encoded access key as a query parameter
      className="display-media"
      id="md_photo"
      data-filename={props.currentMedia.filename}
      data-date={props.mediaDetails.date}
      data-time={props.mediaDetails.time}
      data-credit={props.mediaDetails.credit}
      alt=""
      target="_blank"
    />;
  }

  // Setup video
  else if (props.mode === 'videos') {
    mediaTag = <video controls preload="metadata"
      src={props.currentMedia.src + "?key=" + btoa(props.accessKey)}  // Submit base64-encoded access key as a query parameter
      className="display-media"
      id="md_video"
      data-filename={props.currentMedia.filename}
      data-date={props.mediaDetails.date}
      data-time={props.mediaDetails.time}
      data-credit={props.mediaDetails.credit}
      alt=""
    />;
  }

  return (
    <div className="display" id={"g_" + props.mode + "_display"}>
      <a className="display-link">
        {mediaTag}
      </a>
    </div>
  );

}


//┣━━━━━━━━━━━━━━━━┓
//┃  Custom Hooks  ┃
//┣━━━━━━━━━━━━━━━━┛

function useGetS3Objects(endpointDomain, accessKey) {
  const [objects, setObjects] = useState({
    list: [],
    error: false,
  });

  useEffect(() => {
    // List objects in S3 bucket.
    // Returns a NodeList of <Contents> elements, each containing a file path or a folder path (with size 0).
    fetch(`https://${endpointDomain}/?key=${btoa(accessKey)}`)  // Submit base64-encoded access key as a query parameter
      .then((response) => response.text())
      .then((xml) => new window.DOMParser().parseFromString(xml, "text/xml"))
      .then((data) => { setObjects({ list: data.querySelectorAll("Contents"), error: false }); console.log("[DEBUG]:S3 API fetch @ " + Date.now()); })
      .catch((error) => setObjects({ list: [], error: error }));
  }, []);  // run once (never re-render)

  return objects;
}

// Event listener hook  [Recipe: https://usehooks.com/useEventListener/]
function useEventListener(eventName, handler, element = window) {
  // Create a ref that stores handler.
  const savedHandler = useRef();
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler without us needing to
  //  pass it in effect deps array and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  useEffect(
    () => {
      // Make sure element supports addEventListener.
      const isSupported = element && element.addEventListener;
      if (!isSupported) return;
      // Create event listener that calls handler function stored in ref.
      const eventListener = (event) => savedHandler.current(event);
      // Add event listener
      element.addEventListener(eventName, eventListener);
      // Remove event listener on cleanup.
      return () => {
        element.removeEventListener(eventName, eventListener);
      };
    },
    [eventName, element]  // Re-run if eventName or element changes.
  );
}

// Touch interface horizontal swipe functionality
//  [Adapted from https://stackoverflow.com/questions/2264072/detect-a-finger-swipe-through-javascript-on-the-iphone-and-android]
// TODO: Use React Native to do this instead?
function useHorizonalSwipeNav(updateIndex, minChangeX = 60, maxChangeY = 120) {
  // Variables to hold the start and end coords for each axis
  const [touchCoords, setTouchCoords] = useState({
    startX: null,
    startY: null,
  });

  // Handler callbacks for the touchstart and touchend events
  const touchStartHandler = useCallback(
    (e) => {
      setTouchCoords({ startX: e.changedTouches[0].screenX, startY: e.changedTouches[0].screenY })
    }, []
  );
  const touchEndHandler = useCallback(
    (e) => {
      if (!touchCoords.startX || !touchCoords.startY) {
        console.log("[DEBUG]: Attempted to handle a swipe with 'null' touch coords.");
        return;
      }

      // Get current state of touch coords (at 'touchend')
      let endX = e.changedTouches[0].screenX, endY = e.changedTouches[0].screenY;

      // Check that the swipe didn't go past the vertical tolerance (maxChangeY)
      // HACK: Should check that the y-coords never go outside of tolerance during the swipe, not just at endpoints?
      if (Math.abs(endY - touchCoords.startY) > maxChangeY)
        console.log("[DEBUG]: Checked for swipe -> No swipe (too far on y-axis).");

      // 👈 Swiped left? 👈
      else if (endX < (touchCoords.startX - minChangeX)) {
        console.log("[DEBUG]: Checked for swipe -> Left swipe (navigating forward).");
        // Swipe left = Move right
        updateIndex(1);
      }

      // 👉 Swiped right? 👉
      else if (endX > (touchCoords.startX + minChangeX)) {
        console.log("[DEBUG]: Checked for swipe -> Right swipe (navigating backward).");
        // Swipe right = Move left
        updateIndex(-1);
      }

      // ✖ No swipe ✖
      else {
        console.log("[DEBUG]: Checked for swipe -> No swipe (not far enough on x-axis).");
      }

      // Reset starting touch coords
      setTouchCoords({ startX: null, startY: null });
    }, [touchCoords, updateIndex, minChangeX, maxChangeY]
  );

  // Attach touch event listeners to the document
  useEventListener('touchstart', touchStartHandler, document);
  useEventListener('touchend', touchEndHandler, document);
}