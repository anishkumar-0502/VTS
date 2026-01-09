import React from 'react';

const Contact: React.FC = () => {
  return (
    <section id="contact" className="contact_area pt-50">
      <div className="container">
        <div className="row">
          <div className="col-lg-4">
            <div className="contact_info mt-45">
              <div className="section_title pb-15">
                <h4 className="title">Get In Touch</h4>
                <p>Have questions about TrackIT VTS? Our team is here to help you find the best solution for your business.</p>
              </div>
              <div className="single_info d-flex align-items-center mt-15">
                <div className="info_icon">
                  <i className="lni lni-phone"></i>
                </div>
                <div className="info_content media-body">
                  <p>+123465894883</p>
                  <p>+123874922737</p>
                </div>
              </div>
              <div className="single_info d-flex align-items-center mt-15">
                <div className="info_icon">
                  <i className="lni lni-envelope"></i>
                </div>
                <div className="info_content media-body">
                  <p>support@trackitvts.com</p>
                </div>
              </div>
              <div className="single_info d-flex align-items-center mt-15">
                <div className="info_icon">
                  <i className="lni lni-map-marker"></i>
                </div>
                <div className="info_content media-body">
                  <p>123 Tech Park, Innovation Way, Silicon Valley, CA, USA</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="contact_form pt-20">
              <form id="contact-form" action="#" method="post">
                <div className="row">
                  <div className="col-md-6">
                    <div className="single_form mt-30">
                      <input type="text" name="name" placeholder="Name" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="single_form mt-30">
                      <input type="email" name="email" placeholder="Email" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="single_form mt-30">
                      <input type="text" name="number" placeholder="Phone Number" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="single_form mt-30">
                      <input type="text" name="subject" placeholder="Subject" />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="single_form mt-30">
                      <textarea name="message" placeholder="Message"></textarea>
                    </div>
                  </div>
                  <p className="form-message"></p>
                  <div className="col-md-12">
                    <div className="single_form mt-30">
                      <button className="main-btn">Submit</button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
