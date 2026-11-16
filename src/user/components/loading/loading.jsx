import React from 'react' 
import './loading.scss'

export default function Loader() {
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="premium-loader">
          <div className="shimmer-circle"></div>
          <div className="book-outer"></div>
        </div>
        <div className="loading-text">
          Loading<span className="dots"></span>
        </div>
      </div>
    </div>
  )
}
