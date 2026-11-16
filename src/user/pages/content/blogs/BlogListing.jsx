import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, BookOpen, Search, Sparkles, MessageSquare } from "lucide-react";
import api from "../../../../api";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import "./BlogListing.scss";

export default function BlogListing() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await api.get("/api/blogs");
        const blogsData = res.data?.data || res.data || [];
        setBlogs(Array.isArray(blogsData) ? blogsData : []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setBlogs([]);
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="blog-listing-page">
      <div className="blog-hero">
        <div className="container">
          <div className="hero-badge">Knowledge Hub</div>
          <h1>Study Blog & Insights</h1>
          <p>Expert tips, exam strategies, and the latest academic news to help you stay ahead.</p>
          
          <div className="blog-search-bar">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search for articles, tips, or news..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="container">
        {filteredBlogs.length > 0 ? (
          <div className="blogs-grid">
            {filteredBlogs.map((blog, idx) => (
              <div 
                key={blog.id} 
                className="blog-card-ultimate wow animate__fadeInUp"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <Link to={`/blog/${blog.id}`} className="card-link">
                  <div className="card-media">
                    <img
                       src={getOptimizedImageUrl(blog.image) || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800"}
                      alt={blog.title}
                      loading="lazy"
                    />
                    <div className="category-label">Education</div>
                    <div className="date-badge">
                      <Calendar size={14} />
                      <span>{new Date(blog.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="card-content">
                    <h2 className="title">{blog.title}</h2>
                    <p className="excerpt">
                      {blog.content?.replace(/<[^>]*>/g, '').slice(0, 120)}...
                    </p>
                    <div className="footer">
                      <div className="read-more">
                        Read Story <ArrowRight size={16} />
                      </div>
                      <div className="meta">
                        <MessageSquare size={16} />
                        <span>Insights</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <BookOpen size={64} className="icon" />
            <h2>No articles found</h2>
            <p>Try searching with different keywords or browse our topics.</p>
          </div>
        )}

        <div className="newsletter-cta glass-card wow animate__fadeIn">
          <div className="cta-content">
            <Sparkles className="icon" size={32} />
            <h3>Get the Latest Insights</h3>
            <p>Join 5,000+ students who receive our weekly study tips directly in their inbox.</p>
          </div>
          <form className="cta-form">
            <input type="email" placeholder="Enter your email" required />
            <button type="submit">Subscribe Now</button>
          </form>
        </div>
      </div>
    </div>
  );
}
