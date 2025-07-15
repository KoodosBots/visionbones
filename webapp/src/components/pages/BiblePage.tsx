import React, { useState, useEffect } from 'react'
import { usePremium } from '../../hooks/usePremium'
import PremiumFeatureGate from '../premium/PremiumFeatureGate'

interface BiblePageProps {
  userId?: string;
}

const BiblePage: React.FC<BiblePageProps> = ({ userId }) => {
  const [savedVerses, setSavedVerses] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedVerses')
    return saved ? JSON.parse(saved) : []
  })
  const [readingPlanProgress, setReadingPlanProgress] = useState(() => {
    const progress = localStorage.getItem('readingPlanProgress')
    return progress ? JSON.parse(progress) : {}
  })
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  
  const { isPremium, isLoading: premiumLoading } = usePremium(userId)
  
  const verses = [
    {
      text: "I can do all things through Christ who strengthens me.",
      reference: "Philippians 4:13",
      theme: "Strength"
    },
    {
      text: "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: "Proverbs 3:5",
      theme: "Trust"
    },
    {
      text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
      reference: "Joshua 1:9",
      theme: "Courage"
    },
    {
      text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
      reference: "Romans 8:28",
      theme: "Hope"
    },
    {
      text: "For I know the plans I have for you,\" declares the Lord, \"plans to prosper you and not to harm you, plans to give you hope and a future.",
      reference: "Jeremiah 29:11",
      theme: "Future"
    }
  ]
  
  useEffect(() => {
    localStorage.setItem('savedVerses', JSON.stringify(savedVerses))
  }, [savedVerses])
  
  useEffect(() => {
    localStorage.setItem('readingPlanProgress', JSON.stringify(readingPlanProgress))
  }, [readingPlanProgress])
  
  const currentVerse = verses[currentVerseIndex] || verses[0]
  
  const getNewVerse = () => {
    const nextIndex = (currentVerseIndex + 1) % verses.length
    setCurrentVerseIndex(nextIndex)
  }
  
  const saveVerse = (reference: string) => {
    if (!savedVerses.includes(reference)) {
      setSavedVerses([...savedVerses, reference])
    }
  }
  
  const shareVerse = (verse: { text: string; reference: string }) => {
    if (navigator.share) {
      navigator.share({
        title: 'Bible Verse',
        text: `"${verse.text}" - ${verse.reference}`,
      })
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`"${verse.text}" - ${verse.reference}`)
    }
  }
  
  const updateReadingPlan = (planId: number, progress: number) => {
    setReadingPlanProgress(prev => ({
      ...prev,
      [planId]: progress
    }))
  }
  const dailyVerse = currentVerse

  const readingPlans = [
    {
      id: 1,
      title: "30 Days of Faith",
      description: "Build your faith through daily readings",
      progress: readingPlanProgress[1] || 0,
      total: 30,
      image: "🙏"
    },
    {
      id: 2,
      title: "Psalms of Victory",
      description: "Find strength in the Psalms",
      progress: readingPlanProgress[2] || 0,
      total: 15,
      image: "🎵"
    },
    {
      id: 3,
      title: "Wisdom for Leaders",
      description: "Leadership lessons from Proverbs",
      progress: readingPlanProgress[3] || 0,
      total: 21,
      image: "👑"
    }
  ]

  const inspirationalQuotes = [
    {
      id: 1,
      text: "Faith is taking the first step even when you don't see the whole staircase.",
      author: "Martin Luther King Jr."
    },
    {
      id: 2,
      text: "God doesn't call the qualified, He qualifies the called.",
      author: "Unknown"
    }
  ]

  return (
    <div className="bible-page">
      {/* Daily Verse Hero Section */}
      <div className="daily-verse-section">
        <div className="verse-card featured">
          <div className="verse-header">
            <div className="verse-theme-badge">{dailyVerse.theme}</div>
            <div className="verse-date">Today's Verse</div>
          </div>
          
          <div className="verse-content">
            <div className="verse-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            </div>
            
            <blockquote className="verse-text">
              "{dailyVerse.text}"
            </blockquote>
            
            <cite className="verse-reference">— {dailyVerse.reference}</cite>
          </div>

          {/* Instagram-style verse actions */}
          <div className="verse-actions">
            <div className="action-buttons">
              <button 
                className={`action-btn ${savedVerses.includes(dailyVerse.reference) ? 'active' : ''}`}
                onClick={() => saveVerse(dailyVerse.reference)}
                title="Save verse"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button 
                className="action-btn"
                onClick={() => shareVerse(dailyVerse)}
                title="Share verse"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
              <PremiumFeatureGate
                isPremium={isPremium}
                featureName="savedVerses"
                showUpgradePrompt={false}
              >
                <button className="action-btn" title="Add note">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
              </PremiumFeatureGate>
            </div>
            <button className="new-verse-btn" onClick={getNewVerse}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              New Verse
            </button>
          </div>
        </div>
      </div>

      {/* Reading Plans Section */}
      <div className="reading-plans-section">
        <div className="section-header">
          <h2 className="section-title">Reading Plans</h2>
          <button className="see-all-btn">See All</button>
        </div>

        {/* Instagram-style reading plans grid */}
        <div className="reading-plans-grid">
          {readingPlans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="plan-header">
                <div className="plan-icon">
                  <span className="plan-emoji">{plan.image}</span>
                </div>
                <div className="plan-info">
                  <h3 className="plan-title">{plan.title}</h3>
                  <p className="plan-description">{plan.description}</p>
                </div>
                <button className="plan-menu-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
              
              <div className="plan-progress-section">
                <div className="progress-stats">
                  <span className="progress-numbers">{plan.progress}/{plan.total} days</span>
                  <span className="progress-percentage">{Math.round((plan.progress / plan.total) * 100)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(plan.progress / plan.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="plan-actions">
                <button 
                  className={`plan-action-btn ${plan.progress === 0 ? 'primary' : 'secondary'}`}
                  onClick={() => {
                    const newProgress = Math.min(plan.progress + 1, plan.total)
                    updateReadingPlan(plan.id, newProgress)
                  }}
                >
                  {plan.progress === 0 ? 'Start Reading' : plan.progress === plan.total ? 'Completed' : 'Continue'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="quick-actions-section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>

        {/* Instagram-style quick actions grid */}
        <div className="quick-actions-grid">
          <div className="action-row">
            <PremiumFeatureGate
              isPremium={isPremium}
              featureName="prayerRequests"
              showUpgradePrompt={false}
            >
              <button className="quick-action-card">
                <div className="action-icon prayer">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="action-content">
                  <div className="action-title">Prayer Requests</div>
                  <div className="action-subtitle">Share & pray together</div>
                </div>
              </button>
            </PremiumFeatureGate>
            
            <button className="quick-action-card">
              <div className="action-icon study">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="action-content">
                <div className="action-title">Bible Study</div>
                <div className="action-subtitle">Join group studies</div>
              </div>
            </button>
          </div>
          
          <div className="action-row">
            <button 
              className="quick-action-card"
              onClick={() => {
                // Show saved verses
                console.log('Saved verses:', savedVerses)
              }}
            >
              <div className="action-icon saved">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="action-content">
                <div className="action-title">Saved Verses</div>
                <div className="action-subtitle">{savedVerses.length} verses saved</div>
              </div>
            </button>
            
            <PremiumFeatureGate
              isPremium={isPremium}
              featureName="prayerReminders"
              showUpgradePrompt={false}
            >
              <button className="quick-action-card">
                <div className="action-icon prayer-time">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                </div>
                <div className="action-content">
                  <div className="action-title">Daily Prayer</div>
                  <div className="action-subtitle">Set prayer reminders</div>
                </div>
              </button>
            </PremiumFeatureGate>
          </div>
        </div>
      </div>

      {/* Inspiration Section */}
      <div className="inspiration-section">
        <div className="section-header">
          <h2 className="section-title">Daily Inspiration</h2>
        </div>

        {/* Instagram-style inspiration cards */}
        <div className="inspiration-feed">
          {inspirationalQuotes.map((quote) => (
            <div key={quote.id} className="inspiration-post">
              <div className="post-header">
                <div className="post-avatar">
                  <div className="avatar-circle inspiration">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                </div>
                <div className="post-info">
                  <div className="post-author">{quote.author}</div>
                  <div className="post-type">Daily Inspiration</div>
                </div>
                <button className="post-menu">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
              
              <div className="post-content">
                <blockquote className="quote-text">
                  "{quote.text}"
                </blockquote>
              </div>
              
              <div className="post-actions">
                <div className="action-buttons">
                  <button className="post-action-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <button 
                    className="post-action-btn"
                    onClick={() => shareVerse({ text: quote.text, reference: quote.author })}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>
                  <PremiumFeatureGate
                    isPremium={isPremium}
                    featureName="notes"
                    showUpgradePrompt={false}
                  >
                    <button className="post-action-btn">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                  </PremiumFeatureGate>
                </div>
                <button 
                  className="bookmark-btn"
                  onClick={() => saveVerse(quote.author)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
              
              <div className="post-engagement">
                <div className="likes-count">24 likes</div>
                <div className="post-time">2 hours ago</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BiblePage