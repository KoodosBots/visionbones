import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTelegram } from '../../hooks/useTelegram'

interface Platform {
  id: string
  name: string
  display_name: string
  description: string | null
  icon_url: string | null
}

interface OnboardingPageProps {
  onComplete: () => void
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [platformUsername, setPlatformUsername] = useState('')
  const [username, setUsername] = useState('')
  const { user } = useTelegram()

  // Fetch available platforms
  const { data: platforms, isLoading: platformsLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('display_name')
      
      if (error) throw error
      return data as Platform[]
    }
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      telegram_id: string
      username: string
      selected_platform: string
      platform_username: string
    }) => {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      onComplete()
    }
  })

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setStep(2)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !selectedPlatform || !platformUsername.trim() || !username.trim()) {
      return
    }

    createUserMutation.mutate({
      telegram_id: user.id.toString(),
      username: username.trim(),
      selected_platform: selectedPlatform.name,
      platform_username: platformUsername.trim()
    })
  }

  if (platformsLoading) {
    return (
      <div className="onboarding-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading platforms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h1>🎯 Welcome to VisionBones</h1>
        <p>Track your domino stats across all platforms in one place</p>
        <div className="progress-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>
      </div>

      {step === 1 && (
        <div className="step-content">
          <h2>Choose Your Platform</h2>
          <p>Select the domino gaming platform you play on:</p>
          
          <div className="platform-grid">
            {platforms?.map((platform) => (
              <button
                key={platform.id}
                className="platform-card"
                onClick={() => handlePlatformSelect(platform)}
              >
                {platform.icon_url && (
                  <img 
                    src={platform.icon_url} 
                    alt={platform.display_name}
                    className="platform-icon"
                  />
                )}
                <h3>{platform.display_name}</h3>
                {platform.description && (
                  <p>{platform.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedPlatform && (
        <div className="step-content">
          <h2>Enter Your Details</h2>
          <p>Tell us about yourself and your {selectedPlatform.display_name} account:</p>
          
          <form onSubmit={handleSubmit} className="onboarding-form">
            <div className="form-group">
              <label htmlFor="username">Display Name</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="How should others see you?"
                required
                maxLength={50}
              />
              <small>This is how you'll appear on leaderboards</small>
            </div>

            <div className="form-group">
              <label htmlFor="platform-username">
                {selectedPlatform.display_name} Username
              </label>
              <input
                id="platform-username"
                type="text"
                value={platformUsername}
                onChange={(e) => setPlatformUsername(e.target.value)}
                placeholder={`Your username on ${selectedPlatform.display_name}`}
                required
                maxLength={100}
              />
              <small>
                This helps admins find and verify your stats on {selectedPlatform.display_name}
              </small>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createUserMutation.isPending || !username.trim() || !platformUsername.trim()}
              >
                {createUserMutation.isPending ? 'Creating Account...' : 'Complete Setup'}
              </button>
            </div>
          </form>

          {createUserMutation.error && (
            <div className="error-message">
              <p>Failed to create account. Please try again.</p>
              <small>{createUserMutation.error.message}</small>
            </div>
          )}
        </div>
      )}

      <div className="onboarding-footer">
        <p className="text-center">
          <strong>What happens next?</strong><br/>
          An admin will manually verify your stats on {selectedPlatform?.display_name || 'your platform'} and add them to the leaderboard.
          You'll be notified once your stats are verified!
        </p>
      </div>
    </div>
  )
}

export default OnboardingPage