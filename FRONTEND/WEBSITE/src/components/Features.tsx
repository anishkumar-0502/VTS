import React from 'react';

const Features: React.FC = () => {
  return (
    <section id="features" className="features_area pt-95">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-9">
            <div className="section_title text-center pb-25">
              <h4 className="title">TrackIT VTS Features</h4>
              <p>Comprehensive tools designed to give you full control over your fleet and logistics operations.</p>
            </div>
          </div>
        </div>
        <div className="row text-center">
          <div className="col-lg-3 col-sm-6">
            <div className="single_features mt-30">
              <i className="lni lni-map-marker"></i>
              <h5 className="title">Live Tracking</h5>
              <p>Real-time location updates for all your vehicles.</p>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="single_features mt-30">
              <i className="lni lni-users"></i>
              <h5 className="title">Driver Management</h5>
              <p>Assign drivers and monitor performance efficiently.</p>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="single_features mt-30">
              <i className="lni lni-car"></i>
              <h5 className="title">Vehicle Monitoring</h5>
              <p>Track maintenance and fuel usage for your fleet.</p>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="single_features mt-30">
              <i className="lni lni-stats-up"></i>
              <h5 className="title">Analytics</h5>
              <p>Detailed reports and insights to optimize operations.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
