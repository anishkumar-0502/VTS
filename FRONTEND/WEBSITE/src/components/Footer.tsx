import React from 'react';

const Footer: React.FC = () => {
  return (
    <section id="footer" className="footer_area">
      <div className="footer_widget pt-50 pb-100">
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              <div className="footer_about mt-50">
                <a href="/">
                  <img src="/logo.png" alt="TrackIT VTS Logo" style={{ maxWidth: '150px', marginLeft: '-10px' }} />
                </a>
                <p>TrackIT VTS provides cutting-edge vehicle tracking solutions for modern fleets. Real-time insights, safety, and efficiency at your fingertips.</p>
                <ul className="social">
                  <li><a href="#"><i className="lni lni-facebook-filled"></i></a></li>
                  <li><a href="#"><i className="lni lni-twitter-original"></i></a></li>
                  <li><a href="#"><i className="lni lni-instagram-original"></i></a></li>
                  <li><a href="#"><i className="lni lni-linkedin-original"></i></a></li>
                </ul>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="footer_link_wrapper d-flex flex-wrap">
                <div className="footer_link mt-45">
                  <h4 className="footer_title">Quick Links</h4>
                  <ul className="link">
                    <li><a href="#">Terms of Service</a></li>
                    <li><a href="#">Refund Policy</a></li>
                    <li><a href="#">Support</a></li>
                    <li><a href="#">Branches</a></li>
                    <li><a href="#">License</a></li>
                  </ul>
                </div>
                <div className="footer_link mt-45">
                  <h4 className="footer_title">Solutions</h4>
                  <ul className="link">
                    <li><a href="#features">Live Tracking</a></li>
                    <li><a href="#features">Fleet Management</a></li>
                    <li><a href="#features">Driver Monitoring</a></li>
                    <li><a href="#features">Analytics</a></li>
                  </ul>
                </div>
                <div className="footer_link mt-45">
                  <h4 className="footer_title">Resources</h4>
                  <ul className="link">
                    <li><a href="#home">Home</a></li>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#video">Tutorial</a></li>
                    <li><a href="#gallery">Gallery</a></li>
                    <li><a href="#contact">Contact</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer_copyright">
        <div className="container">
          <div className="copyright text-center">
            <p>Copyright &copy; {new Date().getFullYear()} TrackIT VTS. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Footer;
