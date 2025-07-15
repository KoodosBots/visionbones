import { useState } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './App.css'
import Header from './components/layout/Header'
import BottomTabNavigation from './components/layout/BottomTabNavigation'
import LeaderboardPage from './components/pages/LeaderboardPage'
import ProfilePage from './components/pages/ProfilePage'
import BiblePage from './components/pages/BiblePage'
import AdminPage from './components/pages/AdminPage'
import OnboardingPage from './components/pages/OnboardingPage'
import StripeProvider from './components/common/StripeProvider'
import { queryClient } from './lib/queryClient'
import { useTelegram } from './hooks/useTelegram'
import { supabase } from './lib/supabase'

export type TabType = 'leaderboard' | 'profile' | 'bible' | 'admin'

interface UserData {
  id: string
  telegram_id: string
  username: string
  selected_platform: string
  platform_username: string
  is_premium: boolean
  verified_badge: boolean
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard')
  const { user, isReady } = useTelegram()
  
  // Check if user exists in database
  const { data: userData, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', user.id.toString())
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
      }
      
      return data as UserData | null
    },
    enabled: !!user?.id
  })
  
  if (!isReady || userLoading) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading VisionBones...</p>
        </div>
      </div>
    )
  }

  // Show onboarding if user doesn't exist in database
  if (user && !userData) {
    return (
      <div className="app">
        <OnboardingPage onComplete={() => refetchUser()} />
      </div>
    )
  }

  const userId = user?.id?.toString() || 'test-user-123'

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
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider>
        <AppContent />
      </StripeProvider>
      
      {/* React Query DevTools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

export default App
