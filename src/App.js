import React from 'react';
import './App.css';
import logo from './logo.svg';

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
        onClick={() => {this.setState({pressed: true}); this.props.onClick(); }}
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

class Content extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'photos',
      currentPhoto: null,
      currentVideo: null,
    };
  }

  componentWillUnmount() {
    // Clean up
    //this.????.dispose();
  }

  render() {
    if (this.state.mode === 'photos') {
      return (
        <div className="content" id="c_photo">
          <img src={this.state.currentPhoto} />
        </div>
      );
    }
    else {
      return (
        <div className="content" id="c_video">
          <video src={this.state.currentVideo} />
        </div>
      );
    }
  }
}

class Details extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      
    };
  }

  render() {
    return (
      <div className="details">
        
      </div>
    );
  }

}


// Main app layout
function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* <Header /> */}
        <img src={logo} className="App-logo" alt="logo" />
      </header>

      <div className="App-content">
        <Content />
      </div>
      
      <div className="App-details">
        <Details />
      </div>

    </div>
  );
}

export default App;
