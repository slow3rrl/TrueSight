import { useLayoutEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import LoginScreen from "./auth/LoginScreen";
import SignupScreen from "./auth/SignupScreen";
import StudentScreen from "./screens/student/StudentScreen";
import StudentActivityDetailsPage from "./screens/student/StudentActivityDetailsPage";
import StudentSubmissionPage from "./screens/student/StudentSubmissionPage";
import TeacherScreen from "./screens/teacher/TeacherScreen";
import SubmissionDetailPage from "./screens/teacher/SubmissionDetailPage";
import SubmissionAnalysisReportPage from "./screens/teacher/SubmissionAnalysisReportPage";
import IntegrityAnalyticsPage from "./screens/teacher/IntegrityAnalyticsPage";
import DocumentViewerPage from "./screens/shared/DocumentViewerPage";
import "./index.css";

const resetScrollPositions = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document
    .querySelectorAll<HTMLElement>("[data-route-scroll-container]")
    .forEach((element) => {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    });
};

const page = (children: ReactNode) => (
  <motion.div
    className="min-h-screen w-full"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    onAnimationStart={resetScrollPositions}
    onAnimationComplete={resetScrollPositions}
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    resetScrollPositions();

    const frame = window.requestAnimationFrame(resetScrollPositions);
    const transitionFallback = window.setTimeout(resetScrollPositions, 260);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(transitionFallback);
    };
  }, [location.pathname, location.search]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/auth/login_screen" replace />} />

        {/* Auth routes */}
        <Route path="/auth/login_screen" element={page(<LoginScreen />)} />
        <Route path="/auth/signup_screen" element={page(<SignupScreen />)} />

        {/* Student pages */}
        <Route path="/student/student_screen" element={page(<StudentScreen />)} />
        <Route
          path="/student/classes/:classId/activities/:activityId"
          element={page(<StudentActivityDetailsPage />)}
        />
        <Route
          path="/student/activities/:activityId/submit"
          element={page(<StudentSubmissionPage />)}
        />

        {/* Shared preview */}
        <Route
          path="/documents/:documentType/:documentId"
          element={page(<DocumentViewerPage />)}
        />

        {/* Teacher pages */}
        <Route
          path="/teacher/teacher_screen"
          element={<Navigate to="/teacher/teacher_screen/home" replace />}
        />
        <Route
          path="/teacher/submissions/:submissionId"
          element={page(<SubmissionDetailPage />)}
        />
        <Route
          path="/teacher/submissions/:submissionId/analysis"
          element={page(<SubmissionAnalysisReportPage />)}
        />
        <Route
          path="/teacher/integrity-analytics"
          element={page(<IntegrityAnalyticsPage />)}
        />
        <Route path="/teacher/teacher_screen/:section" element={page(<TeacherScreen />)} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth/login_screen" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
