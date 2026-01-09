import React from 'react';
import videoImage from '../assets/images/video_image.png';
import videoShape from '../assets/images/video_shape.svg';

const Tutorial: React.FC = () => {
  return (
    <section id="video" className="video_area pt-95 pb-95" style={{ position: 'relative', overflow: 'hidden' }}>
      <div 
        className="video_shape" 
        style={{ 
          position: 'absolute', 
          top: '-50px', 
          left: 0, 
          width: '100%',
          height: '70%',
          zIndex: -1 
        }}
      >
        <img src={videoShape} alt="shape" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-9 pt-100">
            <div className="section_title text-center pb-25">
              <h4 className="title">Getting Started Guide</h4>
              <p>Follow our simple guide to get your TrackIT VTS system up and running in minutes.</p>
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="video_content mt-30 text-center" style={{ position: 'relative' }}>
              <div className="video_image" style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                <img src={videoImage} alt="video" style={{ width: '100%' }} />
              </div>
              <div 
                className="video_icon" 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                <a 
                  className="video-popup" 
                  href="https://www.youtube.com/watch?v=79PQSyE0p9k"
                  style={{
                    width: '60px',
                    height: '60px',
                    lineHeight: '60px',
                    textAlign: 'center',
                    background: '#fff',
                    color: '#465fff',
                    borderRadius: '50%',
                    fontSize: '20px',
                    display: 'inline-block',
                    boxShadow: '0px 10px 30px rgba(70, 95, 255, 0.3)'
                  }}
                >
                  <i className="lni lni-play"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Tutorial;
