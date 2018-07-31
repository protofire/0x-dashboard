import React, { PureComponent } from "react";
import { Link } from "react-router-dom";
import FontAwesome from 'react-fontawesome';
import NavList from './NavList';
import "./Navigation.css";

export default class Navigation extends PureComponent {
  render() {
    const currentPath = window && window.location ? window.location.href.split('/') : null;
    const path = currentPath[currentPath.length - 1];
    return (
      <div className="navigation" ref={nav => { this.nav = nav; }}>
        <div className="logo">
          <FontAwesome
              className="nav-icon"
              name="bars"
              onClick={this.props.handleNav}
          />
          <span className="logo-0">Ox</span><span className="logo-x">Dashboard</span>
        </div>
        <div className={this.props.navCollapse ? "nav-collapse nav-open" : "nav-collapse"}>
          <ul className="nav-menu">
            {NavList.map((item, index) =>
                <li key={index} className="nav-list-item">
                    <Link onClick={this.handleNav} to={item.link} className={(item.link === path) ? "nav-list-item-link active-link" : "nav-list-item-link"} >
                        <FontAwesome className="nav-list-icon" name={item.icon} />
                        {item.label}
                    </Link>
                </li>
            )}
          </ul>
        </div>
      </div>
    )
  }
}
