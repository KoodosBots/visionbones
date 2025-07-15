import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './App.css'
import Header from './components/layout/Header'
import BottomTabNavigation from './components/layout/BottomTabNavigation'
import LeaderboardPage from './components/pages/LeaderboardPage'
import ProfilePage from './components/pages/ProfilePage'
import BiblePage from './components/pages/BiblePage'
import AdminPage from './components/pages/AdminPage'
import StripeProvider from './components/common/StripeProvider'
import { queryClient } from './lib/queryClient'
import { useTelegram } from './hooks/useTelegram'

export type TabType = 'leaderboard' | 'profile' | 'bible' | 'admin'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard')
  const { user, isReady } = useTelegram()
  
  // Mock user ID for development - in production this would come from Telegram auth
  const userId = user?.id?.toString() || 'test-user-123'
  
  if (!isReady) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading VisionBones...</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'leaderboard':
        return <LeaderboardPage userId={userId} />
      case 'profile':
        return <ProfilePage userId={userId} />
      case 'bible':
        return <BiblePage userId={userId} />
      case 'admin':
        return <AdminPage userId={userId} />
      default:
        return <LeaderboardPage userId={userId} />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider>
        <div className="app">
          {/* Instagram-style Fixed Header */}
          <Header />

          {/* Main Content Area - Instagram style */}
          <main className="main-container">
            <div className="content-wrapper">
              {renderContent()}
            </div>
          </main>

          {/* Instagram-style Bottom Tab Navigation */}
          <BottomTabNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            userId={userId}
          />
        </div>
      </StripeProvider>
      
      {/* React Query DevTools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

export default App
