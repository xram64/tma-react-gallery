import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="ErrorPage">

      <h1 className="error-page-header">
        :(
      </h1>

      <h3 className="error-page-subheader">
        oh nooo! our website! it's broken!
      </h3>

      <br /><br />

      <p className="error-page-msg-title">
        Error:
      </p>

      <p className="error-page-msg-text">
        {error.statusText || error.message}
      </p>

    </div>
  );
}