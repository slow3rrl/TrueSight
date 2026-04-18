import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, default to dark
    const savedTheme = localStorage.getItem('truesight-theme') as Theme
    return savedTheme || 'dark'
  })

  useEffect(() => {
    // Update HTML class and localStorage when theme changes
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('truesight-theme', theme)
  }, [theme])

  // Initialize theme on mount
  useEffect(() => {
    const root = window.document.documentElement
    const savedTheme = localStorage.getItem('truesight-theme') as Theme || 'dark'
    root.classList.add(savedTheme)
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}