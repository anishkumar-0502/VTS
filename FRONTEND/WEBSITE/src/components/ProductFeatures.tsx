import React from 'react';
import productFeaturesImg from '../assets/images/product_features.png';

const ProductFeatures: React.FC = () => {
  return (
    <section id="product_features" className="product_features_area pt-95 pb-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-9">
            <div className="section_title text-center pb-25">
              <h4 className="title">Fleet Management Board</h4>
              <p>Comprehensive monitoring and control system for your entire fleet operation.</p>
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-lg-12">
            <div className="product_features_content mt-30" style={{ position: 'relative' }}>
              <div className="product_image text-center">
                <img src={productFeaturesImg} alt="product features" style={{ width: '100%', maxWidth: '1000px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductFeatures;
