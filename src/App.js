// React //
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// AWS //
const s3_bucketParams = { name: "tma-meetup-kushoglake-2022", region: "us-east-1" };

/*  ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
 *  • Layout
 *    - Header with toggle for image/video modes, navigation buttons, and media detail
 *    - Full-window image/video view
 *
 *  • TODO
 *    (•) Add (pop-out?) list view for images/videos in bucket.
 *    (•) Add sorting options/controls.
 *    (•) Add an info icon to show tooltip in mouseover (keyboard shortcuts, etc).
 *    (?) Add menu option to open image/video in new tab.
 *    (?) Add menu option to download image/video.
 *    (?) Add a thumbnail row along the bottom (pre-generate thumbnails for each picture).
 *    (?) Set cookie to remember last image/video position.
 * 
 *  ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
*/


////|  ——————————————————————  |\\\\
////|  |  Helper functions  |  |\\\\
////|  ——————————————————————  |\\\\

// A proper modulus function
function mod(n, m) {
  return ((n % m) + m) % m;
}

// Returns an incremented 'index', unless the new index exceeds a 'max' value.
function incrementWithClamp(index, max) {
  var newIndex = index + 1;
  if (newIndex > max) newIndex = max;
  return newIndex;
}
// Returns an decremented 'index', unless the new index exceeds a 'min' value (default 0).
function decrementWithClamp(index, min = 0) {
  var newIndex = index - 1;
  if (newIndex < min) newIndex = min;
  return newIndex;
}

// Returns a sequence of integers of a given 'length' around a 'center' index.
// Odd 'length' sequences will have an equal number of indices on both sides of the 'center'.
// Even 'length' sequences will have one extra number to the right of the 'center'.
function centeredIndexSequence(center, length, minIndex = 0, maxIndex = Number.POSITIVE_INFINITY) {
  var seq = [];
  var indexRange = maxIndex - minIndex + 1;
  var start = center - Math.floor((length - 1) / 2);
  var end = start + length - 1;

  // If the provided 'length' is larger than the 'indexRange', the full [minIndex, maxIndex] index list will be returned.
  if (length > indexRange) {
    for (var i = minIndex; i <= maxIndex; i++) { seq.push(i); }
    return seq;
  }

  // Generate sequence (may include out-of-bounds indices)
  for (var i = start; i <= end; i++) { seq.push(i); }

  // If the centered sequence would cross the [minIndex, maxIndex] boundary, it will be shifted to fit.
  if (seq[0] < minIndex) { seq = seq.map((idx) => idx + (minIndex - seq[0])) }
  else if (seq[seq.length - 1] > maxIndex) { seq = seq.map((idx) => idx - (seq[seq.length - 1] - maxIndex)) }

  return seq;
}

// Returns the Unix timestamp from a 'YYYYMMDD_HHMMSS' formatted filename
function getUnixTimestamp(filename) {
  var timestamp = filename.split('.')[0];
  var date = timestamp.split('_')[0];
  var time = timestamp.split('_')[1];
  var year = date.substring(0, 4), month = date.substring(4, 6), day = date.substring(6, 8);
  var hour = time.substring(0, 2), minute = time.substring(2, 4), second = time.substring(4, 6);
  second = (second === "XX") ? "00" : second;
  return new Date(year, month, day, hour, minute, second).getTime();
}

// Reads an XML NodeList of <Contents> elements from an S3 bucket and returns a
//  list of {mediatype, foldername, filename, src} objects, covering all files in the bucket.
function parseBucketFileList(contentNodes, bucketName) {
  var contentList = [];

  for (var i = 0; i < contentNodes.length; i++) {
    var contentNode = contentNodes[i];

    var size = contentNode.querySelector("Size").innerHTML;
    //var uploadDate = contentNode.querySelector("LastModified").innerHTML;

    if (size !== "0") {
      // Folders will have Size='0', so this must be a file
      var fullpath = contentNode.querySelector("Key").innerHTML;  // entire relative S3 path
      var mediatype = fullpath.split("/")[0];     // main directory: 'images' or 'videos'
      var foldername = fullpath.split("/")[1];    // contains credit name
      var filename = fullpath.split("/")[2];      // '20220710_123456.jpg/mp4' format
      var src = "https://" + bucketName + ".s3.amazonaws.com/" + fullpath;

      contentList.push({ mediatype, foldername, filename, src });
    }
  }

  // Default sort list: By mediatype, then date/time
  contentList.sort((a, b) => {
    if (a.mediatype === "images" && b.mediatype === "videos") return -1;
    else if (a.mediatype === "videos" && b.mediatype === "images") return 1;
    else if (a.mediatype === b.mediatype) {
      if (getUnixTimestamp(a.filename) < getUnixTimestamp(b.filename)) return -1;
      if (getUnixTimestamp(a.filename) > getUnixTimestamp(b.filename)) return 1;
    }
  });
  var contentListImages = contentList.filter((item) => {
    return item.mediatype === "images";
  });
  var contentListVideos = contentList.filter((item) => {
    return item.mediatype === "videos";
  });

  return [contentListImages, contentListVideos];
}

// Parses the filename for date/time info and the foldername for credit info.
function parseDetails(filename, foldername) {
  // Split timestamp label and file type
  var label = filename.split('.')[0];   // YYYYMMDD_HHMMSS
  var type = filename.split('.')[1];    // jpg|mp4

  // Get date/time info from filename label (e.g. 20220711_134520)
  var date = label.split('_')[0];
  var time = label.split('_')[1];

  // Break date/time info into components
  var year = date.substring(0, 4);
  var month = date.substring(4, 6);
  var day = date.substring(6, 8);

  var hour = time.substring(0, 2);
  var minute = time.substring(2, 4);
  var second = time.substring(4, 6);
  second = (second === "XX") ? "00" : second;

  // Convert to 12-hr time
  var ampm = hour >= 12 ? 'pm' : 'am';
  hour = (hour == 0 | hour == 12) ? 12 : (hour % 12);

  // Format readable date string
  var date_fmt = month + '/' + day + '/' + year + ' ';
  // Format readable time string
  var time_fmt = hour + ':' + minute + ' ' + ampm;

  // Capitalize credit name from foldername
  var creditName = foldername.charAt(0).toUpperCase() + foldername.slice(1);
  var credit_fmt = "📷 " + creditName;    // 📷 = &#x1F4F7

  // Return an object with the formatted details
  return { date: date_fmt, time: time_fmt, credit: credit_fmt };
}


////|  ——————————————————————  |\\\\
////|  |     Components     |  |\\\\
////|  ——————————————————————  |\\\\

function Content(props) {
  // [Update triggers]
  // - User navigates to a different photo/video
  // - User switches between photo/video modes using a MenuButton

  // [State]
  // - Content will receive events from the Header component when the user clicks a "mode" MenuButton.
  // - Content will also receive events from the Navigation component when the user navigates to a different 
  //    image/video (changing the current image/video).
  // - Both of these events will change the state of the Content component, with new data passed down 
  //    to 'Display' and 'Details' as props.

  // These shouldn't change once the lists are filled from the S3 bucket.
  const [imagesList, setImagesList] = useState([]);
  const [videosList, setVideosList] = useState([]);

  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('images');
  const [currentMedia, setCurrentMedia] = useState({ src: null, filename: null, foldername: null });
  const [currentIndex, setCurrentIndex] = useState({ image: -1, video: -1 });
  const [currentSort, setCurrentSort] = useState({ type: 'default', dir: 'ascending' });

  const s3_objects = useGetS3Objects(s3_bucketParams.name);  // Custom hook: Get list of S3 objects from bucket


  /// [Content — Initialization] ///

  // Get image/video lists from S3 bucket
  useEffect(() => {
    if (s3_objects.list) {
      var [images_list, videos_list] = parseBucketFileList(s3_objects.list, s3_bucketParams.name);
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
          setCurrentMedia({ src: h_media.src, filename: h_media.filename, foldername: h_media.foldername });
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
          setCurrentMedia({ src: imagesList[0].src, filename: imagesList[0].filename, foldername: imagesList[0].foldername });
          setCurrentIndex({ image: 0, video: 0 });
          // Clear the URL fragment (leaves the #)
          window.location.hash = '';
        }
      }
      else {
        // Defaults (if no URL fragment is provided)  // DRY
        setCurrentMedia({ src: imagesList[0].src, filename: imagesList[0].filename, foldername: imagesList[0].foldername });
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
        }

        // Update media
        if (mode === 'images')
          setCurrentIndex({ image: n_index, video: currentIndex.video });
        else if (mode === 'videos')
          setCurrentIndex({ image: currentIndex.image, video: n_index });
      } 
    }, [currentIndex, setCurrentIndex, mode, ready]
  );
  // Add event listener for the arrow key event handler, using our custom hook
  useEventListener("keydown", navKeyHandler);


  /// [Content — Rendering] ///

  // Update on changes to 'currentIndex' or 'mode'
  useEffect(() => {
    if (ready) {
      console.log("[DEBUG] currentMedia.src: " + currentMedia.src + " | currentIndex.image: " + currentIndex.image + " | currentIndex.video: " + currentIndex.video);  // TEST

      if (mode === 'images') {
        setCurrentMedia({
          src: imagesList[currentIndex.image].src,
          filename: imagesList[currentIndex.image].filename,
          foldername: imagesList[currentIndex.image].foldername
        });
      }

      else if (mode === 'videos') {
        setCurrentMedia({
          src: videosList[currentIndex.video].src,
          filename: videosList[currentIndex.video].filename,
          foldername: videosList[currentIndex.video].foldername
        });
      }
    }
  }, [currentIndex, mode]);


  // If the list is ready
  if (ready) {
    var mediaDetails = parseDetails(currentMedia.filename, currentMedia.foldername);

    return (
      <div className="content" id={"c_" + mode}>

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
        />

        <Display mode={mode} currentMedia={currentMedia} mediaDetails={mediaDetails} />

      </div>
    );
  }

  // If the list is not ready
  else {
    return (
      <div className="content-loading">
        <div className="content-loading-text">
          Loading...
        </div>

        {s3_objects.error &&
          <div className='content-error-text'>
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
          props.setCurrentIndex({ image: decrementWithClamp(props.currentIndex.image, 0), video: props.currentIndex.video });
        else if (props.mode === 'videos')
          props.setCurrentIndex({ video: decrementWithClamp(props.currentIndex.video, 0), image: props.currentIndex.image });
      }} />

      {/*  Numbered buttons  */}
      {centeredIndexSequence(center, navButtonCount, 0, maxIndex).map((i) =>
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
          props.setCurrentIndex({ image: incrementWithClamp(props.currentIndex.image, props.imagesListLength - 1), video: props.currentIndex.video });
        else if (props.mode === 'videos')
          props.setCurrentIndex({ video: incrementWithClamp(props.currentIndex.video, props.videosListLength - 1), image: props.currentIndex.image });
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
    <div className="header-details" id={"c_" + props.mode + "_details"}>
      <div className="header-details-date">{props.mediaDetails.date}</div>
      <div className="header-details-time">{props.mediaDetails.time}</div>
      <div className="header-details-credit">{props.mediaDetails.credit}</div>
    </div>
  );
}


function Display(props) {
  // Content should pass down the photo/video to this component as a prop.

  var mediaTag = null;

  // Setup photo
  if (props.mode === 'images') {
    mediaTag = <img
      src={props.currentMedia.src}
      className="display-media"
      id="md_photo"
      data-filename={props.currentMedia.filename}
      data-foldername={props.currentMedia.foldername}
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
      src={props.currentMedia.src}
      className="display-media"
      id="md_video"
      data-filename={props.currentMedia.filename}
      data-foldername={props.currentMedia.foldername}
      data-date={props.mediaDetails.date}
      data-time={props.mediaDetails.time}
      data-credit={props.mediaDetails.credit}
      alt=""
    />;
  }

  return (
    <div className="display" id={"c_" + props.mode + "_display"}>
      <a className="display-link">
        {mediaTag}
      </a>
    </div>
  );

}


///|  Custom Hooks  |\\\

function useGetS3Objects(bucketName) {
  const [objects, setObjects] = useState({
    list: [],
    error: false,
  });

  useEffect(() => {
    // List objects in S3 bucket
    // Returns a NodeList of <Contents> elements, each containing a file path or a folder path (with size 0)
    fetch("https://" + bucketName + ".s3.amazonaws.com/")
      .then((response) => response.text())
      .then((xml) => new window.DOMParser().parseFromString(xml, "text/xml"))
      .then((data) => { setObjects({ list: data.querySelectorAll("Contents"), error: false }); console.log("[DEBUG]: API fetch @ " + Date.now()); })
      .catch(error => setObjects({ list: [], error: error }));
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


///|  Root Component  |\\\
function App() {
  return (
    <div className="App">
      <Content />
    </div>
  );
}

export default App;
