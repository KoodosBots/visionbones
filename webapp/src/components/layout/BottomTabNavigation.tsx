import React from 'react'
import type { TabType } from '../../App'

interface BottomTabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  userId?: string
}

const BottomTabNavigation: React.FC<BottomTabNavigationProps> = ({ 
  activeTab, 
  onTabChange,
  userId 
}) => {
  // Check if user is admin (simplified check for demo - in production this would be more secure)
  const isAdmin = userId === 'admin' || userId === 'test-user-123'
  
  const tabs = [
    {
      id: 'leaderboard' as TabType,
      icon: (
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
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      label: 'Leaderboard'
    },
    {
      id: 'profile' as TabType,
      icon: (
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
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
        </svg>
      ),
      label: 'Profile'
    },
    {
      id: 'bible' as TabType,
      icon: (
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
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
      ),
      label: 'Bible'
    }
  ]
  
  // Add admin tab if user is admin
  if (isAdmin) {
    tabs.push({
      id: 'admin' as TabType,
      icon: (
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
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      label: 'Admin'
    })
  }

  return (
    <nav className="bottom-tab-nav">
      <div className="nav-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
          >
            <div className="nav-icon">
              {tab.icon}
            </div>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomTabNavigation