import { Outlet, useLocation, useNavigate } from "react-router"
import { ChevronLeft } from "lucide-react"

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Pages where we don't want a back button
  const isRoot = location.pathname === "/" || location.pathname === "/teacher" || location.pathname === "/student"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col font-sans text-gray-900 dark:text-slate-100 transition-colors duration-500">
      <div className="flex-1 w-full max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500">
        {/* Simple Header */}
        {!isRoot && location.pathname !== "/" && location.pathname !== "/signup" && (
          <header className="h-14 flex items-center px-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors duration-500">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center font-medium mr-7 text-sm text-gray-800 dark:text-slate-200">
              TrueSight
            </div>
          </header>
        )}
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
