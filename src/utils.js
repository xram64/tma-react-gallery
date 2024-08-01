//┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
//┃  Utility/Helper Functions  ┃
//┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

// A proper modulus function
export function mod(n, m) {
  return ((n % m) + m) % m;
}

// Returns an incremented 'index', unless the new index exceeds a 'max' value.
export function incrementWithClamp(index, max) {
  var newIndex = index + 1;
  if (newIndex > max) newIndex = max;
  return newIndex;
}

// Returns an decremented 'index', unless the new index exceeds a 'min' value (default 0).
export function decrementWithClamp(index, min = 0) {
  var newIndex = index - 1;
  if (newIndex < min) newIndex = min;
  return newIndex;
}

// Returns a sequence of integers of a given 'length' around a 'center' index.
// Odd 'length' sequences will have an equal number of indices on both sides of the 'center'.
// Even 'length' sequences will have one extra number to the right of the 'center'.
export function centeredIndexSequence(center, length, minIndex = 0, maxIndex = Number.POSITIVE_INFINITY) {
  var seq = [];
  var indexRange = maxIndex - minIndex + 1;
  var start = center - Math.floor((length - 1) / 2);
  var end = start + length - 1;

  // If the provided 'length' is larger than the 'indexRange', the full [minIndex, maxIndex] index list will be returned.
  if (length > indexRange) {
    for (let i = minIndex; i <= maxIndex; i++) { seq.push(i); }
    return seq;
  }

  // Generate sequence (may include out-of-bounds indices)
  for (let i = start; i <= end; i++) { seq.push(i); }

  // If the centered sequence would cross the [minIndex, maxIndex] boundary, it will be shifted to fit.
  if (seq[0] < minIndex) { seq = seq.map((idx) => idx + (minIndex - seq[0])) }
  else if (seq[seq.length - 1] > maxIndex) { seq = seq.map((idx) => idx - (seq[seq.length - 1] - maxIndex)) }

  return seq;
}

// Returns the Unix timestamp from `YYYYMMDD` datestamp and a `HHMMSS` timestamp.
export function getUnixTimestamp(datestamp, timestamp) {
  var year = datestamp.substring(0, 4), month = datestamp.substring(4, 6), day = datestamp.substring(6, 8);
  var hour = timestamp.substring(0, 2), minute = timestamp.substring(2, 4), second = timestamp.substring(4, 6);
  
  // Check for placeholder 'XX' in minutes field, and set minutes to '00' if present
  minute = (minute === "XX") ? "00" : minute;

  // Check for placeholder 'XX' in seconds field, and set seconds to '00' if present
  if (second === "XX") second = "00";
  // Check for ordered placeholder 'X#' in seconds field, where `#` is a digit, and set seconds to match (monotonically)
  else if (second.charAt(0) === "X") second = "0" + second.charAt(1);

  return new Date(year, month, day, hour, minute, second).getTime();
}

// Reads an XML NodeList of <Contents> elements from an S3 bucket and returns a list of
//  {mediatype, filename, datestamp, timestamp, credit, src} objects, covering all files in the bucket.
export function parseBucketFileList(contentNodes, endpointDomain) {
  var contentList = [];

  for (var i = 0; i < contentNodes.length; i++) {
    var contentNode = contentNodes[i];

    var size = contentNode.querySelector("Size").innerHTML;
    //var uploadDate = contentNode.querySelector("LastModified").innerHTML;

    if (size !== "0") {  // Folders will have Size='0', so this must be a file
      var fullpath = contentNode.querySelector("Key").innerHTML;  // entire relative S3 path
      var mediatype = fullpath.split("/")[0];                     // main directory: `images` or `videos`
      var filename  = fullpath.split("/")[1];                     // format: `20220710_123456_CREDITNAME.jpg/mp4`

      var datestamp = filename.split(".")[0].split("_")[0];       // `20220710`
      var timestamp = filename.split(".")[0].split("_")[1];       // `123456`
      var credit    = filename.split(".")[0].split("_")[2];       // `CREDITNAME`

      var src = `https://${endpointDomain}/${fullpath}`;

      contentList.push({ mediatype, filename, datestamp, timestamp, credit, src });
    }
  }

  // Default sort list: By mediatype, then date/time.
  // TODO: Move sorting from here into component, after load.
  contentList.sort((a, b) => {
    if (a.mediatype === "images" && b.mediatype === "videos") return -1;
    else if (a.mediatype === "videos" && b.mediatype === "images") return 1;
    else if (a.mediatype === b.mediatype) {
      if (getUnixTimestamp(a.datestamp, a.timestamp) < getUnixTimestamp(b.datestamp, b.timestamp)) return -1;
      if (getUnixTimestamp(a.datestamp, a.timestamp) > getUnixTimestamp(b.datestamp, b.timestamp)) return 1;
    }
    return 0;
  });
  var contentListImages = contentList.filter((item) => {
    return item.mediatype === "images";
  });
  var contentListVideos = contentList.filter((item) => {
    return item.mediatype === "videos";
  });

  return [contentListImages, contentListVideos];
}

// Parses the filename for full date/time info and the credit name.
export function parseDetails(datestamp, timestamp, credit) {
  // Break datestamp into components
  var year = datestamp.substring(0, 4);
  var month = datestamp.substring(4, 6);
  var day = datestamp.substring(6, 8);

  // Break timestamp into components
  var hour = timestamp.substring(0, 2);
  var minute = timestamp.substring(2, 4);
  var second = timestamp.substring(4, 6);

  // Check for placeholder 'XX' in minutes field, and set minutes to '00' if present
  minute = (minute === "XX") ? "00" : minute;  // check for 'XX' placeholder in minute field
  
  // Check for placeholder 'XX' in seconds field, and set seconds to '00' if present
  if (second === "XX") second = "00";
  // Check for ordered placeholder 'X#' in seconds field, where `#` is a digit, and set seconds to match (monotonically)
  else if (second.charAt(0) === "X") second = "0" + second.charAt(1);

  // TODO: Pass up a flag to indicate approximate times (with placeholder X's in filename), and display in a tooltip over the time.

  // Convert to 12-hr time
  var ampm = hour >= 12 ? 'pm' : 'am';
  hour = (hour == 0 | hour == 12) ? 12 : (hour % 12);

  // Format readable date string
  var date_fmt = month + '/' + day + '/' + year + ' ';
  // Format readable time string
  var time_fmt = hour + ':' + minute + ' ' + ampm;

  // Capitalize credit name from `credit` (if needed)
  var creditName = credit.charAt(0).toUpperCase() + credit.slice(1);
  var credit_fmt = "📷 " + creditName;    // 📷 = &#x1F4F7

  // Return an object with the formatted details
  return { date: date_fmt, time: time_fmt, credit: credit_fmt };
}

export function setCookieAsJSON(cookieName, jsonObj) {
  // Convert JSON object into an encoded string.
  const jsonString = JSON.stringify(jsonObj);
  const encodedJSONString = encodeURIComponent(jsonString);
  
  // Set a cookie with the encoded JSON string.
  document.cookie = `${cookieName}=${encodedJSONString};max-age=${86400*365*5}`;  // 5 years (86400 seconds = 1 day)
}

export function readCookieAsJSON(cookieName) {
  // Get the string for this cookie by name
  const cookie = document.cookie.split("; ").find(row => row.startsWith(cookieName));
  if (!cookie) return null;

  // Read cookie and return the decoded JSON string.
  const cookieValue = cookie.split('=')[1];
  const decodedJSONString = decodeURIComponent(cookieValue);
  return JSON.parse(decodedJSONString);
}

// Prepares an image/video file for download-on-click by fetching the file as a blob, creating an object URL, and clicking a hidden anchor tag to trigger downloading.
// This is needed because file downloads cannot be triggered cross-origin. Instead, we make a new URL on this origin pointing to a blob of the file data.
export function downloadMediaViaBlob(mediaURL, mediaFilename) {
  fetch(mediaURL, { mode: 'cors' })
    .then((response) => response.blob())
    .then((blob) => {
      // Create a (same-origin) URL pointing to the blob.
      const blobURL = window.URL.createObjectURL(blob);

      // Create an link to trigger the blob download and click it.
      const blobLink = document.createElement('a');
      blobLink.style.display = 'none';
      blobLink.href = blobURL;
      blobLink.download = mediaFilename;
      document.body.appendChild(blobLink);
      blobLink.click();

      // Cleanup
      window.URL.revokeObjectURL(blobURL);
      document.body.removeChild(blobLink);
    })
    .catch(() => console.error('Could not download the image at ' + mediaURL));
}