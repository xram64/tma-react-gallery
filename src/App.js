import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './logo.svg';
import TEST_IMG_1 from './test_content/20220712_210535.jpg';
import TEST_VID_1 from './test_content/20220714_163909.mp4';

const TEST_IMG_1_NAME = "20220712_210535.jpg";
const TEST_IMG_1_FOLDER = "Law";
const TEST_VID_1_NAME = "20220714_163909.mp4";
const TEST_VID_1_FOLDER = "Jesse";

/*  ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
 *  • Description
 *    - Header with BG image and links to switch between photos/videos
 *    - Full-window photo/video view (thumbnail row along the bottom? pre-generate thumbnails for each picture?)
 *  
 *  • Page layout components
 *    - Content
 *    - Header
 *      · MenuButton
 *    - Display
 *    - Details
 *    - Navigation
 *  ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
*/

//|————————————————————————————|//
//|  <|| Helper functions ||>  |//
//|————————————————————————————|//

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

  // Format readable date string
  var date_fmt = month + '/' + day + '/' + year + ' ';
  // Format readable time string
  var time_fmt = hour + ':' + minute + ':' + second;

  // Capitalize credit name from foldername
  var creditName = foldername.charAt(0).toUpperCase() + foldername.slice(1);
  var credit_fmt = "Taken by " + creditName + ".";

  // Return an object with the formatted details
  return { date: date_fmt, time: time_fmt, credit: credit_fmt };
}


//|——————————————————————|//
//|  <|| Components ||>  |//
//|——————————————————————|//


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

  const [mode, setMode] = useState('photos');
  const [media, setMedia] = useState({ src: TEST_IMG_1, filename: TEST_IMG_1_NAME, foldername: TEST_IMG_1_FOLDER });  // TODO: Fix defaults

  // TODO: Add state to keep track of last-used photo/video on mode changes and navigation?

  // Update the 'media' state when 'mode' is changed by a MenuButton
  useEffect(() => {
    if (mode === 'photos') {
      // TODO: Set default media here??
      setMedia({ src: TEST_IMG_1, filename: TEST_IMG_1_NAME, foldername: TEST_IMG_1_FOLDER });
    }
    else if (mode === 'videos') {
      // TODO: Set default media here??
      setMedia({ src: TEST_VID_1, filename: TEST_VID_1_NAME, foldername: TEST_VID_1_FOLDER });
    }
  }, [mode]);  // Only update when 'mode' changes, ignoring changes to 'media' made by the Navigation component


  return (
    <div className="content" id={"c_" + mode}>

      <Header mode={mode} setMode={setMode} media={media} setMedia={setMedia} />

      <Display mode={mode} media={media} />

    </div>
  );
}


function Header(props) {
  return (
    <div className="header">

      <div className="header-menu">
        <MenuButton label="Photos" onClick={() => props.setMode('photos')} />
        <MenuButton label="Videos" onClick={() => props.setMode('videos')} />
      </div>

      <div className="header-nav">
        <Navigation media={props.media} setMedia={props.setMedia} />
      </div>

      <div className="header-details">
        <Details mode={props.mode} media={props.media} />
      </div>

    </div>
  );
}


function MenuButton(props) {
  return (
    <button className="header-menu-btn" onClick={ () => { props.onClick(); } }>
      {props.label}
    </button>
  );
}

function Display(props) {
  // Content should pass down the photo/video to this component as a prop.

    var mediaTag = null;

    // Setup photo
    if (props.mode === 'photos') {
      // TODO: Implement null checking for currentPhoto
      // TODO: Set default if no photo is selected?

      mediaTag = <img
        src={props.media.src}
        className="media"
        id="md_photo"
        data-filename={props.media.filename}
        data-foldername={props.media.foldername}
        alt={"" /* TODO: Bring parsed info from Details component into here? */}
      />;
    }

    // Setup video
    else if (props.mode === 'videos') {
      // TODO: Implement null checking for currentVideo
      // TODO: Set default if no video is selected?

      // TODO: (!!!!) Fix video playback/controls. Fix CSS sizing to fit content in window.


      mediaTag = <video
        src={props.media.src}
        className="media"
        id="md_video"
        data-filename={props.media.filename}
        data-foldername={props.media.foldername}
        alt={"" /* TODO: Bring parsed info from Details component into here? */}
      />;
    }

    return (
      <div className="display" id={"c_" + props.mode + "_display"}>
        {mediaTag}
      </div>
    );

}


function Details(props) {
  // Content should pass down the file and folder names of the current photo/video to this component as props.

    var details = parseDetails(props.media.filename, props.media.foldername);

    return (
      <div className="details" id={"c_" + props.mode + "_details"}>
        <div className="date">{details.date}</div>
        <div className="time">{details.time}</div>
        <div className="credit">{details.credit}</div>
      </div>
    );

}


function Navigation(props) {
  // TODO: Move out nav buttons into separate component?

  return (
    <span>
      {"← Back  |  Next →"}
    </span>
  );
}


// Root app component
function App() {
  return (
    <div className="App">
      <Content />
    </div>
  );
}

export default App;
