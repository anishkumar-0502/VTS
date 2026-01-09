import React from 'react';
import headerShape from '../assets/images/header_shape.png';
import headerImage from '../assets/images/header_image.png';

const Header: React.FC = () => {
  return (
    <section className="header_area">
      <div className="header_navbar">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <nav className="navbar navbar-expand-lg align-items-center">
                <a className="navbar-brand d-flex align-items-center" href="/">
                  <img src="/logo.png" alt="TrackIT VTS Logo" style={{ maxWidth: '150px', marginTop: '-10px' }} />
                </a>
                <button
                  className="navbar-toggler"
                  type="button"
                  data-toggle="collapse"
                  data-target="#navbarSupportedContent"
                  aria-controls="navbarSupportedContent"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <span className="toggler-icon"></span>
                  <span className="toggler-icon"></span>
                  <span className="toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse sub-menu-bar" id="navbarSupportedContent">
                  <ul id="nav" className="navbar-nav ml-auto align-items-center">
                    <li className="nav-item active">
                      <a className="page-scroll" href="#home">Home</a>
                    </li>
                    <li className="nav-item">
                      <a className="page-scroll" href="#features">Features</a>
                    </li>
                    <li className="nav-item">
                      <a className="page-scroll" href="#about">About</a>
                    </li>
                    <li className="nav-item">
                      <a className="page-scroll" href="#video">Tutorial</a>
                    </li>
                    <li className="nav-item">
                      <a className="page-scroll" href="#gallery">Gallery</a>
                    </li>
                    <li className="nav-item">
                      <a className="page-scroll" href="#contact">Contact</a>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div id="home" className="header_hero d-lg-flex align-items-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="header_hero_content">
                <h2 className="header_title">Next-Gen <span>Vehicle</span> Tracking & Fleet Intelligence</h2>
                <p>Empowering modern fleets with real-time precision, data-driven insights, and seamless logistics management.</p>
                <a href="#features" className="main-btn">Get Started</a>
              </div>
            </div>
          </div>
        </div>
        <div
          className="header_shape bg_cover d-none d-lg-block"
          style={{ backgroundImage: `url(${headerShape})` }}
        ></div>
        <div className="header_image d-flex align-items-center">
          <div className="image">
            <img src={headerImage} alt="header image" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Header;
