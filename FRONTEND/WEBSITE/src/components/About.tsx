import React from 'react';
import aboutShape from '../assets/images/about_shape.svg';
import aboutImage from '../assets/images/about.png';

const About: React.FC = () => {
  return (
    <section id="about" className="about_area pt-95">
      <div className="about_shape d-none d-lg-block">
        <img src={aboutShape} alt="shape" />
      </div>
      <div className="about_image d-flex align-items-center justify-content-center">
        <div className="image">
          <img src={aboutImage} alt="about" />
        </div>
      </div>
      <div className="container">
        <div className="row justify-content-end">
          <div className="col-lg-6">
            <div className="about_content">
              <div className="section_title pb-25">
                <h4 className="title">Why Choose TrackIT VTS?</h4>
                <p>TrackIT VTS is more than just a tracking tool; it's a complete ecosystem for managing your logistics. From individual vehicle monitoring to enterprise-level fleet management, we provide the precision and reliability you need.</p>
                <p>Our platform offers seamless integration with various hardware devices, providing operators with a unified dashboard to oversee all activities, ensure safety, and reduce operational costs.</p>
              </div>
              <a href="#features" className="main-btn">Learn More</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
