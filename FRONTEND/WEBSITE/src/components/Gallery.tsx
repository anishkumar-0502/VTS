import React from 'react';

const Gallery: React.FC = () => {
  const images = [
    {
      url: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80&w=800',
      title: 'Basic Tracker T1',
      price: '$45.00',
      oldPrice: '$60.00',
      badge: '-25%',
      badgeType: 'discount'
    },
    {
      url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800',
      title: 'Advanced GPS Hub X5',
      price: '$120.00',
      oldPrice: '$150.00',
      badge: 'New',
      badgeType: 'new'
    },
    {
      url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d59085?auto=format&fit=crop&q=80&w=800',
      title: 'OBD-II Smart Link',
      price: '$85.00',
      oldPrice: '$99.00',
      badge: '-15%',
      badgeType: 'discount'
    },
    {
      url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
      title: 'Asset Tracker Pro',
      price: '$110.00',
      oldPrice: '$130.00',
      badge: 'New',
      badgeType: 'new'
    },
    {
      url: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&q=80&w=800',
      title: 'Fuel Sensor Kit',
      price: '$199.00',
      oldPrice: '$250.00',
      badge: '-20%',
      badgeType: 'discount'
    }
  ];

  return (
    <section id="gallery" className="gallery_area pt-120 pb-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="section_title text-center pb-25">
              <h4 className="title">VTS Hardware & Kits</h4>
              <p>Explore our range of high-precision tracking devices and sensors tailored for modern fleet management needs.</p>
            </div>
          </div>
        </div>
        <div className="row flex-nowrap overflow-auto pb-30">
          {images.map((image, index) => (
            <div key={index} className="col-lg-3 col-md-6" style={{ minWidth: '280px' }}>
              <div className="single_gallery mt-30">
                <div className="gallery_badge">
                  {image.badge && (
                    <span className={`badge ${image.badgeType}`}>{image.badge}</span>
                  )}
                </div>
                <div className="gallery_image">
                  <img src={image.url} alt={image.title} className="constant_image" />
                </div>
                <div className="gallery_content mt-15 text-center">
                  <div className="stars">
                    <i className="lni lni-star-filled"></i>
                    <i className="lni lni-star-filled"></i>
                    <i className="lni lni-star-filled"></i>
                    <i className="lni lni-star-filled"></i>
                    <i className="lni lni-star"></i>
                  </div>
                  <h5 className="gallery_title">{image.title}</h5>
                  <div className="price">
                    <span className="old">{image.oldPrice}</span>
                    <span className="current">{image.price}</span>
                  </div>
                  <div className="gallery_button mt-15">
                    <button className="main-btn">ADD TO CARD</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
