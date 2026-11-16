import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../../api";
import "./blogdetails.scss";
import { ArrowLeft } from "lucide-react";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { Helmet } from "react-helmet-async";

const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    api.get(`/api/blogs/${id}`)
      .then((res) => {
        const blogData = res.data?.data || res.data;
        setBlog(blogData);
      })
      .catch((err) => {
        console.error("Error fetching blog:", err);
        setBlog(null);
      });
  }, [id]);

  if (!blog) return <div className="loading">Loading...</div>;

  const readingTime = blog.content ? Math.ceil(blog.content.split(/\s+/).length / 200) : 1;

  return (
    <div className="blog-details-page">
      <Helmet>
        <title>{`${blog.title} | Book My Study Guide`}</title>
        <meta name="description" content={blog.content?.replace(/<[^>]*>/g, '').slice(0, 160)} />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.content?.replace(/<[^>]*>/g, '').slice(0, 200)} />
        <meta property="og:image" content={getOptimizedImageUrl(blog.image)} />
        <meta property="og:type" content="article" />
      </Helmet>

      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        <span>Back to Insights</span>
      </button>

      <div className="blog-container">
        {/* HEADER SECTION - NOW AT TOP */}
        <header className="blog-header">
          <div className="category-label">Academic Insights</div>
          <h1>{blog.title}</h1>

          <div className="blog-meta">
            <div className="meta-left">
              {blog.author && (
                <span className="author">
                  <span className="icon">✍️</span> {blog.author}
                </span>
              )}
              {blog.createdAt && (
                <span className="date">
                  <span className="icon">📅</span> {new Date(blog.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              )}
            </div>
            <div className="meta-right">
              <span className="reading-time">⏱️ {readingTime} min read</span>
            </div>
          </div>
        </header>

        {/* HERO SECTION - REFINED ADAPTIVE */}
        {blog.image && (
          <div className="blog-hero">
            <div className="image-wrapper">
              <img
                src={getOptimizedImageUrl(blog.image)}
                alt={blog.title}
              />
            </div>
          </div>
        )}

        {/* CONTENT PLATE */}
        <main className="blog-content">
          <div className="description" dangerouslySetInnerHTML={{ __html: blog.content }} />

          <footer className="blog-footer">
            <div className="share-section">
              <span>Share this insight:</span>
              <div className="share-buttons">
                {/* Icons placeholder for now */}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default BlogDetails;
