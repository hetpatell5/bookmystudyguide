import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Slider from "react-slick";
import { ArrowRight, BookText, Calendar, Quote, Sparkles } from "lucide-react";
import api from "../../../../api";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import "./bloglist.scss";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slidesToShow, setSlidesToShow] = useState(3);

  useEffect(() => {
    api.get("/api/blogs")
      .then((res) => {
        const blogsData = res.data?.data || res.data || [];
        setBlogs(Array.isArray(blogsData) ? blogsData : []);
      })
      .catch((err) => {
        console.error("Error fetching blogs:", err);
        setBlogs([]);
      })
      .finally(() => setLoading(false));
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

  const settings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 800,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    slidesToShow: slidesToShow,
    slidesToScroll: 1,
    customPaging: i => (
      <div className="custom-dot"></div>
    )
  };

  if (loading || blogs.length === 0) return null;

  return (
    <section className="blog-section luxury-grid">
      <div className="container">

        <div className="section-header wow animate__fadeInUp">
          <div className="header-badge gradient-badge">
            <BookText size={16} />
            <span>Latest Insights</span>
          </div>
          <h2 className="section-title">From Our <span className="gradient-text">Knowledge Hub</span></h2>
          <p className="section-desc">
            Stay updated with the latest exam patterns, study tips, and academic news.
          </p>
        </div>

        <div className="slider-wrapper wow animate__fadeInUp" data-wow-delay="0.3s">
          <Slider {...settings} className="premium-blog-slider">
            {blogs.map((blog, index) => (
              <div className="slider-item" key={blog.id}>
                <Link to={`/blog/${blog.id}`} className="blog-card-modern">
                  <div className="card-media">
                    <img
                      src={getOptimizedImageUrl(blog.image) || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800"}
                      alt={blog.title}
                      loading="lazy"
                    />
                    <div className="category-tag">Education</div>
                    <div className="date-badge-premium">
                      <Calendar size={12} />
                      <span>{new Date(blog.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="card-body">
                    <h3 className="blog-title">{blog.title}</h3>
                    <p className="blog-desc">
                      {blog.content?.replace(/<[^>]*>/g, '').slice(0, 90)}...
                    </p>
                    <div className="card-footer-premium">
                      <span className="read-more-btn">
                        Explore Story <ArrowRight size={16} />
                      </span>
                      <Sparkles size={16} className="decor-icon" />
                    </div>
                  </div>
                  <div className="hover-effect"></div>
                </Link>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default BlogList;
