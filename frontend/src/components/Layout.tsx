import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { BookOpen, Settings, GraduationCap, Menu, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const Layout = () => {
  const { currentUser, updateProfile, classes } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  const isExpanded = isPinned || isHovered;

  const toggleRole = () => {
    const newRole = currentUser.role === 'teacher' ? 'student' : 'teacher';
    updateProfile({ role: newRole, name: newRole === 'teacher' ? 'Alex Johnson (Teacher)' : 'Jordan Smith (Student)' });
    navigate('/');
  };

  const displayClasses = classes.filter(c => 
    currentUser.role === 'teacher' ? c.teacherId === currentUser.id : true
  );

  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500'];

  return (
    <div className={clsx(
      "min-h-screen transition-colors duration-300 overflow-x-hidden",
      "bg-slate-50 text-slate-900",
      "dark:bg-slate-900 dark:text-slate-100"
    )}>
      {/* Top Header */}
      <header className="fixed top-0 z-50 w-full h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="flex justify-between items-center h-full px-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white mr-2.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">
                True<span className="text-blue-600 dark:text-blue-500">Sight</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleRole}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline-block font-medium uppercase tracking-wider">{currentUser.role} Demo</span>
            </button>

            <button onClick={() => navigate('/profile')} className="flex items-center focus:outline-none">
              <img
                className="h-8 w-8 rounded-full object-cover ring-2 ring-transparent hover:ring-blue-500 transition-all"
                src={currentUser.photoUrl}
                alt={currentUser.name}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar & Main Content Wrapper */}
      <div className="flex pt-16 h-full min-h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isExpanded ? 260 : 72 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={clsx(
            "fixed left-0 top-16 bottom-0 z-40 overflow-y-auto overflow-x-hidden flex flex-col",
            "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-shadow",
            !isPinned && isHovered && "shadow-2xl dark:shadow-blue-900/20"
          )}
        >
          <nav className="flex-1 py-4 flex flex-col gap-1">
            <div className="px-3">
              <NavLink
                to="/"
                className={({ isActive }) => clsx(
                  "flex items-center px-3 py-3 rounded-xl transition-colors",
                  isActive && location.pathname === '/' 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Home className="w-6 h-6 flex-shrink-0" />
                <motion.span
                  animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0 }}
                  className="ml-4 overflow-hidden whitespace-nowrap text-sm font-medium"
                >
                  Home
                </motion.span>
              </NavLink>
            </div>

            <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>

            <div className="px-3">
              <motion.div
                animate={{ opacity: isExpanded ? 1 : 0, height: isExpanded ? "auto" : 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 mb-2 mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                  {currentUser.role === 'teacher' ? <BookOpen className="w-3.5 h-3.5 mr-1.5" /> : <GraduationCap className="w-3.5 h-3.5 mr-1.5" />}
                  {currentUser.role === 'teacher' ? 'Teaching' : 'Enrolled'}
                </div>
              </motion.div>
              
              <div className="space-y-1">
                {displayClasses.map((cls, idx) => (
                  <NavLink
                    key={cls.id}
                    to={`/class/${cls.id}`}
                    className={({ isActive }) => clsx(
                      "flex items-center px-3 py-2.5 rounded-xl transition-colors group",
                      isActive 
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                      colors[idx % colors.length]
                    )}>
                      {cls.name.charAt(0).toUpperCase()}
                    </div>
                    <motion.span
                      animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0 }}
                      className="ml-4 overflow-hidden whitespace-nowrap text-sm font-medium truncate"
                    >
                      {cls.name}
                    </motion.span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>

            {/* Settings moved right next to Teaching/Enrolled section */}
            <div className="px-3 mb-4">
              <NavLink
                to="/profile"
                className={({ isActive }) => clsx(
                  "flex items-center px-3 py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Settings className="w-6 h-6 flex-shrink-0" />
                <motion.span
                  animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0 }}
                  className="ml-4 overflow-hidden whitespace-nowrap text-sm font-medium"
                >
                  Settings
                </motion.span>
              </NavLink>
            </div>
          </nav>
        </motion.aside>

        {/* Main Content Area */}
        <main
          className={clsx(
            "flex-1 transition-[margin] duration-300 ease-in-out w-full",
            isPinned ? "ml-[260px]" : "ml-[72px]"
          )}
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
