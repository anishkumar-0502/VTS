import React from 'react';

const SpecialPurposes: React.FC = () => {
  const purposes = [
    {
      id: '01',
      title: 'Logistics & Distribution',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: '02',
      title: 'Cold Chain Monitoring',
      image: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: '03',
      title: 'Public Transport',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
      description: 'Optimize transit routes, ensure passenger safety, and maintain strict schedule adherence with our real-time tracking and analytics platform.',
      hasPinterest: true
    }
  ];

  return (
    <section id="special_purposes" className="special_purposes_area pt-120 pb-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="section_title text-center pb-25">
              <h4 className="title">Tailored Solutions</h4>
              <p>Specialized tracking solutions designed for the unique challenges of different industry sectors.</p>
            </div>
          </div>
        </div>
        <div className="row">
          {purposes.map((purpose, index) => (
            <div key={index} className="col-lg-4 col-md-6">
              <div className={`single_purpose mt-30 ${purpose.description ? 'has_desc' : ''}`}>
                <div className="purpose_image">
                  <img src={purpose.image} alt={purpose.title} className="constant_image" />
                  {purpose.hasPinterest && (
                    <div className="pinterest_badge">
                      <i className="lni lni-save"></i> Save
                    </div>
                  )}
                  <span className="purpose_number">{purpose.id}</span>
                </div>
                <div className="purpose_content">
                  <h5 className="purpose_title">{purpose.title}</h5>
                  {purpose.description && (
                    <p className="purpose_desc">{purpose.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialPurposes;
