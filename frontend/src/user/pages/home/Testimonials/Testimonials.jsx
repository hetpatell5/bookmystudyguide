import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import { Quote, Star, MessageSquare, Sparkles } from "lucide-react";
import api from "../../../../api";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./testimonials.scss";

export default function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [slidesToShow, setSlidesToShow] = useState(3);

  useEffect(() => {
    api.get("/api/reviews").then((res) => {
      const reviewsData = res.data?.success ? res.data.data : (res.data || []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 640) setSlidesToShow(1);
      else if (width <= 1024) setSlidesToShow(2);
      else setSlidesToShow(3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (reviews.length === 0) return null;

  const settings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 1000,
    autoplay: true,
    autoplaySpeed: 6000,
    pauseOnHover: true,
    slidesToShow: slidesToShow,
    slidesToScroll: 1,
    customPaging: i => (
      <div className="custom-dot"></div>
    )
  };

  return (
    <section className="testimonials-section premium-surface">
      <div className="container">

        <div className="section-header wow animate__fadeInUp">
          <div className="header-badge gradient-badge">
            <MessageSquare size={16} />
            <span>Success Stories</span>
          </div>
          <h2 className="section-title">What Our <span className="gradient-text">Students Say</span></h2>
          <p className="section-desc">
            Join thousands of satisfied students who have accelerated their learning with our study materials.
          </p>
        </div>

        <div className="slider-wrapper wow animate__fadeInUp" data-wow-delay="0.3s">
          <Slider {...settings} className="premium-testimonial-slider">
            {reviews.map((rev) => (
              <div key={rev._id} className="slider-item">
                <div className="testimonial-card-modern">
                  <div className="quote-badge">
                    <Quote size={20} />
                  </div>
                  <div className="card-top">
                    <div className="stars-premium">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < (rev.rating || 5) ? "#fbbf24" : "rgba(0,0,0,0.05)"}
                          color={i < (rev.rating || 5) ? "#fbbf24" : "#e2e8f0"}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="comment-box">
                    <p className="comment">"{rev.comment}"</p>
                  </div>

                  <div className="user-profile">
                    <div className="avatar-wrapper">
                      {rev.image ? (
                        <img
                          src={rev.image}
                          alt={rev.name}
                          className="avatar"
                          loading="lazy"
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      ) : (
                        <div className="avatar-init">
                          {rev.name?.charAt(0)}
                        </div>
                      )}
                      <div className="verified-badge">
                        <Sparkles size={10} />
                      </div>
                    </div>
                    <div className="details">
                      <h4>{rev.name}</h4>
                      <span>Verified Academician</span>
                    </div>
                  </div>
                  <div className="card-bg-glow"></div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
}
