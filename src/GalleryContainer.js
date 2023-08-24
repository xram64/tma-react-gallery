import React, { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { sha3_256 } from 'js-sha3';

import { S3BucketParams } from './App';
import Gallery from './Gallery';
import * as Utils from './utils.js';

//┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
//┃  Gallery Container Component  ┃
//┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

// Super-component that will first load the Gateway component, then replace it with the Gallery component if the correct password is submitted.
// Alternatively, the Gallery component may be loaded directly if a password is retrieved from an existing cookie.
export default function GalleryContainer() {
  const { galleryBucketParams } = useLoaderData();  // Get the bucket params passed back by the `galleryLoader` (called by the dynamic route in App.js)
  const [passwordHash, setPasswordHash] = useState(null);

  const { valid: isValid, endpointDomain, accessKey, validatePassword } = useValidatePassword();

  // Each bucket will have its own cookie, as a JSON object. The bucket ID (see S3BucketParams) will follow this prefix.
  // Note: These cookie names must match the names used in the CloudFront function.
  const bucketCookieNamePrefix = 'gallery-bucket-';

  // Callback passed into `Gateway` component. Used to set the state variable holding the password.
  const handlePasswordInput = (inputPassword, inputRemember) => {
    setPasswordHash(sha3_256(inputPassword));

    // Validate password hash with API using custom hook.
    validatePassword(galleryBucketParams['bucketName'], sha3_256(inputPassword));

    if (isValid) {
      // Password valid. Store CloudFront domain and access key in cookies, if requested.
      if (inputRemember) {
        const bucketCookieValue = { "bucket_name": galleryBucketParams['bucketName'], "endpoint_domain": endpointDomain, "access_key": accessKey };
        Utils.setCookieAsJSON(bucketCookieNamePrefix + galleryBucketParams['id'], bucketCookieValue);
      }
      return <Gallery galleryBucketParams={galleryBucketParams} endpointDomain={endpointDomain} accessKey={accessKey} />;
    }
    else {
      // Denied: Ask user for password again. (Clear input box?)
      // HACK! Implement invalid case.
      console.error("Password invalid.");
    }
  };


  // Note: This block (and everything else here) will be re-run every time this component's
  //   state changes, so we can conditionally load either the Gateway or Gallery component.

  // Check user's cookies for an existing gallery access key, before prompting user for password.
  const existingCookie = Utils.readCookieAsJSON(bucketCookieNamePrefix + galleryBucketParams['id'])

  if (existingCookie && existingCookie.access_key) {
    // If an access key is stored in user's cookies, load the `Gallery` component and pass it on along with the bucket params.
    return <Gallery galleryBucketParams={galleryBucketParams} endpointDomain={endpointDomain} accessKey={existingCookie.access_key} />;
    // TODO: This assumes the access key is valid if it exists. Add some checking/error handling here.
  }
  else {
    // Otherwise, load `Gateway` component, passing down the `handlePasswordInput` function to allow it to validate the user's entered password.
    return <Gateway onSubmit={handlePasswordInput} />;
  }
}


//┣━━━━━━━━━━━━━━━━━━━━━━━┓
//┃   Gateway Component   ┃
//┣━━━━━━━━━━━━━━━━━━━━━━━┛

// Gateway component that loads first on any request for a Gallery page, unless a valid password for the gallery is stored in user's cookies.
// Prompts for the password for the selected gallery page, returning the gallery if correct.
export function Gateway(props) {
  const [inputPassword, setInputPassword] = useState(null);
  const [inputRemember, setInputRemember] = useState(false);

  // Form callback, called when submit button is pressed. Calls the `onSubmit` passed down by a prop from `GalleryContainer`.
  const handleSubmit = (e) => {
    e.preventDefault();  // Override default submit button behavior
    if (inputPassword) {
      props.onSubmit(inputPassword, inputRemember);  // Pass values back up to the parent `GalleryContainer` component
    }
    else {
      // TODO: Add error handling
      console.error('No password submitted!');
    }
  };

  // TODO: Add styling for the Gateway page/links
  return (
    <div className="Gateway">
      <div className="Gateway-prompt">
        Enter the password for the <span className="Gateway-gallery-name">{ /* TODO */}</span> gallery:
      </div>
      <div className="Gateway-pasword">
        <form onSubmit={handleSubmit}>
          <input className="Gateway-password-textbox" type="text" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} />
          <button className="Gateway-password-submit" type="submit"></button>
          <label>
            <input className="Gateway-password-remember-box" type="checkbox" checked={inputRemember} onChange={(e) => setInputRemember(e.target.checked)} />
            <span className="Gateway-password-remember-text">Remember password on this device?</span>
          </label>
        </form>
      </div>
    </div>
  );
}

//┣━━━━━━━━━━━━━━━━┓
//┃  Custom Hooks  ┃
//┣━━━━━━━━━━━━━━━━┛
function useValidatePassword() {
  const [valid, setValid] = useState(false);
  const [endpointDomain, setEndpointDomain] = useState(null);
  const [accessKey, setAccessKey] = useState(null);

  // Validate gallery password: POST request -> AWS REST API -> AWS Lambda function
  const validatePassword = (bucket_name, password_hash) => {
    fetch('https://gxn0nu73b2.execute-api.us-east-1.amazonaws.com/v1/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucket_name: bucket_name,
        password_hash: password_hash
      })
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("[DEBUG]: Validation API fetch @ " + Date.now());
        if (data.valid && data.valid == 'Yes') {
          setValid(true);
          setEndpointDomain(data.endpoint_domain);
          setAccessKey(data.access_key);
        }
        else if (data.valid && data.valid == 'No') {
          setValid(false);
          console.error("[API Response] " + "Invalid password for bucket `" + bucket_name + "`.");
        }
        else if (data.error) {
          setValid(false);
          console.error("[API Response] " + data.error);
        }
        else {
          setValid(false);
          console.error("Unknown error occured while reading API response.");
        }
      })
      .catch(error => {
        setValid(false);
        console.error("Error occurred while validating password:", error);
        throw error;
      });
  };

  return { valid, endpointDomain, accessKey, validatePassword }
}

//┣━━━━━━━━━━━━━━━━┓
//┃  Route Loader  ┃
//┣━━━━━━━━━━━━━━━━┛
export function galleryLoader({ params }) {
  // The name of the gallery to be loaded will be passed into this function by the Router when a
  //   dynamic segment is used (i.e. `:galleryPath`), via the `params.galleryPath` variable.
  // Once the `galleryPath` param is loaded and the corresponding bucket object is returned, it can be
  //   accessed by the receiving component (`GalleryContainer`) through the `useLoaderData()` hook.

  let galleryBucketParams = null;

  // Look for a bucket in the list that matches the incoming `galleryPath`
  let bucketMatch = S3BucketParams.find(bucket => bucket.galleryPath === params.galleryPath)

  if (bucketMatch) {
    // Return the bucket object matching the incoming `galleryPath`
    galleryBucketParams = bucketMatch;
  }
  else {
    // HACK! Implement case: Redirect to an error page or reload index.
    console.error("No matching bucket found for the path '" + params.galleryPath + "'!")
  }

  return { galleryBucketParams };
}