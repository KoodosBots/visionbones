import React from 'react'

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left side - App logo/name */}
        <div className="header-left">
          <div className="app-logo">
            <span className="logo-text">VisionBones</span>
          </div>
        </div>

        {/* Center - Empty for Instagram-style clean look */}
        <div className="header-center">
          {/* Empty for clean Instagram look */}
        </div>

        {/* Right side - Action buttons */}
        <div className="header-right">
          <button 
            className="header-action-btn"
            aria-label="Notifications"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          
          <button 
            className="header-action-btn"
            aria-label="Add"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header