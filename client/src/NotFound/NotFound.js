import React, { PureComponent } from "react";
import FontAwesome from 'react-fontawesome';
import { Link } from "react-router-dom";

export default class NotFound extends PureComponent {
  render() {
    return [
      <div className="container-title">
        <div className="container-title-content">
          <h2 className="title">404 Error</h2>
        </div>
      </div>,
      <div className="container-panel">
        <h3>Oops... You just found an error page...</h3>
        <p>We are sorry but the page you are looking for was not found...</p>
        <Link className="btn btn-primary" to="/">
          <FontAwesome name="arrow-left" /> Back to Dashboard
        </Link>
      </div>
    ]
  }
}
