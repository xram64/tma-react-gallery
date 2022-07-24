import React from 'react';
import './App.css';
import logo from './logo.svg';
import TEST_IMG_1 from './test_content/20220712_210535.jpg';
import TEST_VID_1 from './test_content/20220714_163909.mp4';

const TEST_IMG_1_NAME = "20220712_210535.jpg";
const TEST_IMG_1_FOLDER = "Law";
const TEST_VID_1_NAME = "20220714_163909.mp4";
const TEST_VID_1_FOLDER = "Jesse";

/* [App]
• Description
  - Header with BG image and links to switch between photos/videos
  - Full-window photo/video view (thumbnail row along the bottom? pre-generate thumbnails for each picture?)

• Page layout components
  - Header
  - Content
  - Details
    · Get date/time info from filename

• Other components
  - MenuButton
*/

class MenuButton extends React.Component {
  // TODO: Turn into a functional component?
  constructor(props) {
    super(props);
    this.state = {
      pressed: false
    };
  }

  render() {
    return (
      <button
        className={this.state.pressed ? 'pressed' : ''}
        onClick={() => { this.setState({ pressed: true }); this.props.onClick(); }}
      >
        {this.props.label}
      </button>
    );
  }
}

class Header extends React.Component {

  //   // This binding is necessary to make `this` work in the callback
  //   this.handleClick = this.handleClick.bind(this);

  handleClick(target) {
    if (target === 'photos') {
      // Switch to Images page
    }
    if (target === 'videos') {
      // Switch to Videos page
    }
  }

  render() {
    return (
      <div>
        <MenuButton label="Photos" onClick={() => this.handleClick('photos')} />
        <MenuButton label="Videos" onClick={() => this.handleClick('videos')} />
      </div>
    );
  }
}

class Details extends React.Component {
  // Content should pass down the file and folder names of the current photo/video to this component as props.

  // Parses the filename for date/time info and the foldername for credit info.
  parseDetails(filename, foldername) {
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


  render() {
    var details = this.parseDetails(this.props.filename, this.props.foldername);

    return (
      <div className="details">
        <div className="date">{details.date}</div>
        <div className="time">{details.time}</div>
        <div className="credit">{details.credit}</div>
      </div>
    );
  }

}

class Display extends React.Component {
  // Content should pass down the photo/video to this component as a prop.

}

class Content extends React.Component {
  // [Update triggers]
  // - User navigates to a different photo/video
  // - User switches between photo/video modes using a MenuButton
  // - ??


  constructor(props) {
    super(props);
    this.state = {
      mode: 'photos',
      currentPhoto: {photo: null, filename: null, foldername: null},
      currentVideo: {video: null, filename: null, foldername: null},
    };
  }

  componentWillUnmount() {
    // Clean up
    //this.????.dispose();
  }

  // // Function to get image from an S3 bucket
  // getImage(imageName) {
  //   return 'https://s3.amazonaws.com/' + this.props.bucket + '/' + imageName;
  // }

  render() {
    var media = null;
    var mediaMetadata = null;
    var mediaTag = null;

    // Setup photo
    if (this.state.mode === 'photos') {
      // Default if no photo is selected
      if (this.state.currentPhoto.photo === null) {
        this.setState({ currentPhoto: {photo: TEST_IMG_1, filename: TEST_IMG_1_NAME, foldername: TEST_IMG_1_FOLDER} });
      }

      media = this.state.currentPhoto.photo;
      mediaMetadata = {filename: this.state.currentPhoto.filename, foldername: this.state.currentPhoto.foldername};
      mediaTag = <img src={media} id="m_photo" data-filename={mediaMetadata.filename} data-foldername={mediaMetadata.foldername} alt="" />;
    }

    // Setup video
    else if (this.state.mode === 'videos') {
      // Default if no video is selected
      if (this.state.currentVideo.video === null) {
        this.setState({ currentVideo: {video: TEST_VID_1, filename: TEST_VID_1_NAME, foldername: TEST_VID_1_FOLDER} });
      }

      media = this.state.currentVideo.video;
      mediaMetadata = {filename: this.state.currentVideo.filename, foldername: this.state.currentVideo.foldername};
      mediaTag = <video src={media} id="m_video" data-filename={mediaMetadata.filename} data-foldername={mediaMetadata.foldername} alt="" />;
    }


    // Render the photo/video, passing metadata to the Details component
    return (
      <div className="content" id={"c_" + this.state.mode}>

        <div className="content-display" id={"c_" + this.state.mode + "_display"}>
          {mediaTag}
        </div>

        <div className="content-details" id={"c_" + this.state.mode + "_details"}>
          <Details filename={mediaMetadata.filename} foldername={mediaMetadata.foldername} />
        </div>

      </div>
    );
  }
}


// Main app layout
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Header />
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
      </header>

      <div className="App-content">
        <Content />
      </div>

    </div>
  );
}

export default App;
