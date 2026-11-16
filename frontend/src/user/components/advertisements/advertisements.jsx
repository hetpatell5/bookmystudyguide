import React, { useEffect, useState } from 'react';
import api from '../../../api';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { getOptimizedImageUrl, getImageSrcSet } from '../../../utils/imageUtils';
import "./advertisements.scss";

// Detect if current viewport is mobile (≤768px)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}

// Pick the right image: mobileImage on mobile, image on desktop
// If mobileImage is not set, fall back to desktop image
function getAdImage(ad, isMobile) {
  if (isMobile && ad.mobileImage) return ad.mobileImage;
  return ad.image;
}

export default function Advertisements() {
  const [ads, setAds] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await api.get('/api/advertisements');
        const data = response.data?.data || response.data || [];
        const activeAds = (Array.isArray(data) ? data : []).filter(ad => ad.isActive !== false);
        setAds(activeAds);
      } catch (error) {
        console.error("Error fetching advertisements:", error);
      }
    };
    fetchAds();
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: false,
    adaptiveHeight: false,
  };

  if (ads.length === 0) return null;

  const renderImage = (ad, index) => {
    const src = getAdImage(ad, isMobile);
    return (
      <img
        src={getOptimizedImageUrl(src, { width: isMobile ? 768 : 1400 })}
        srcSet={getImageSrcSet(src)}
        sizes={isMobile ? "100vw" : "100vw"}
        alt={ad.title || "Advertisement"}
        fetchpriority={index === 0 ? "high" : "auto"}
        loading={index === 0 ? "eager" : "lazy"}
        className="ad-image"
      />
    );
  };

  return (
    <div className="advertisement-container">
      {ads.length > 1 ? (
        <Slider {...settings}>
          {ads.map((ad, index) => (
            <div key={ad.id} className="ad-slide">
              {renderImage(ad, index)}
            </div>
          ))}
        </Slider>
      ) : (
        <div className="single-ad">
          {renderImage(ads[0], 0)}
        </div>
      )}
    </div>
  );
}
