import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Camera, Sun, Moon, LogOut, X, Bell, BellOff, Edit2, Check } from 'lucide-react'
import { useTheme } from '../theme/ThemeContext';
import { Button } from './ui/Button'
import { LogoutConfirmationDialog } from './LogoutConfirmationDialog'

interface ProfileSectionProps {
  userName: string
  userRole: string
  onClose: () => void
  showEnrolledStudents?: boolean
  enrolledStudentsCount?: number
  onViewEnrolledStudents?: () => void
}

export function ProfileSection({
  userName,
  userRole,
  onClose,
  showEnrolledStudents = false,
  enrolledStudentsCount = 0,
  onViewEnrolledStudents
}: ProfileSectionProps) {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileImage, setProfileImage] = useState<string | null>(
    localStorage.getItem(`profile-image-${userName}`)
  )
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    localStorage.getItem(`notifications-${userName}`) !== 'false'
  )
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(userName)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setProfileImage(result)
        localStorage.setItem(`profile-image-${userName}`, result)
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleNotifications = () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue)
    localStorage.setItem(`notifications-${userName}`, String(newValue))
  }

  const handleSaveName = () => {
    if (editedName.trim()) {
      localStorage.setItem(`username-${userName}`, editedName)
      setIsEditingName(false)
      // In a real app, this would update the backend
    }
  }

  const handleLogout = () => {
    // Clear any session data if needed
    navigate('/')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-6 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300 transition-colors">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Photo Section */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (editedName || userName).charAt(0)
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors group-hover:scale-110 duration-200"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="text-center w-full">
            {isEditingName ? (
              <div className="flex items-center gap-2 justify-center">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-lg text-center font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {editedName || userName}
                </h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{userRole}</p>
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl transition-colors">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Notifications</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  notificationsEnabled ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl transition-colors">
            <div className="flex items-center gap-3">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-blue-400" />
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Appearance</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* View Enrolled Students (Teacher Only) */}
          {showEnrolledStudents && (
            <button
              onClick={onViewEnrolledStudents}
              className="w-full p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-2xl flex items-center justify-between transition-colors font-semibold"
            >
              <span>View Enrolled Students</span>
              <span className="px-2.5 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full">
                {enrolledStudentsCount}
              </span>
            </button>
          )}

          {/* Logout Button */}
          <LogoutConfirmationDialog onConfirm={handleLogout}>
            <Button
              className="w-full p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-2xl flex items-center justify-center gap-3 transition-colors font-semibold"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </LogoutConfirmationDialog>
        </div>
      </div>
    </div>
  )
}
