import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import LoginScreen from "./auth/LoginScreen";
import SignupScreen from "./auth/SignupScreen";
import StudentLoginModule from "./auth/modules/StudentLoginModule";
import StudentSignupModule from "./auth/modules/StudentSignupModule";
import TeacherLoginModule from "./auth/modules/TeacherLoginModule";
import TeacherSignupModule from "./auth/modules/TeacherSignupModule";
import StudentScreen from "./screens/student/StudentScreen";
import StudentActivityDetailsPage from "./screens/student/StudentActivityDetailsPage";
import StudentSubmissionPage from "./screens/student/StudentSubmissionPage";
import TeacherScreen from "./screens/teacher/TeacherScreen";
import SubmissionDetailPage from "./screens/teacher/SubmissionDetailPage";
import SubmissionAnalysisReportPage from "./screens/teacher/SubmissionAnalysisReportPage";
import IntegrityAnalyticsPage from "./screens/teacher/IntegrityAnalyticsPage";
import DocumentViewerPage from "./screens/shared/DocumentViewerPage";
import OfflineInfoPage from "./screens/shared/OfflineInfoPage";
import { useAuth } from "./context/useAuth";
import { useNetworkStatus } from "./context/NetworkStatusContext";
import { canAccessRouteOffline } from "./services/offlineRoutes";
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

function ProtectedRoute({
  roles,
  children,
}: {
  roles: Array<"student" | "teacher">;
  children: ReactNode;
}) {
  const { user, sessionReady } = useAuth();
  const location = useLocation();

  if (!sessionReady) {
    return page(
      <div className="grid min-h-screen place-items-center bg-[var(--app-bg)] text-sm text-[var(--app-text)]">
        Loading session...
      </div>,
    );
  }

  if (!user) {
    return <Navigate to="/auth/login_screen" replace state={{ from: location }} />;
  }

  if (!roles.includes(user.role)) {
    return (
      <Navigate
        to={
          user.role === "teacher"
            ? "/teacher/teacher_screen/home"
            : "/student/student_screen"
        }
        replace
      />
    );
  }

  return page(children);
}

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
        <Route path="/" element={page(<LoginScreen />)} />
        <Route path="/offline" element={page(<OfflineInfoPage />)} />

        {/* Auth routes */}
        <Route path="/auth/login_screen" element={page(<LoginScreen />)} />
        <Route path="/auth/signup_screen" element={page(<SignupScreen />)} />
        <Route path="/auth/student/login" element={page(<StudentLoginModule />)} />
        <Route path="/auth/student/signup" element={page(<StudentSignupModule />)} />
        <Route path="/auth/teacher/login" element={page(<TeacherLoginModule />)} />
        <Route path="/auth/teacher/signup" element={page(<TeacherSignupModule />)} />

        {/* Student pages */}
        <Route
          path="/student/student_screen"
          element={<ProtectedRoute roles={["student"]}><StudentScreen /></ProtectedRoute>}
        />
        <Route
          path="/student/student_screen/:section"
          element={<ProtectedRoute roles={["student"]}><StudentScreen /></ProtectedRoute>}
        />
        <Route
          path="/student/classes/:classId/activities/:activityId"
          element={<ProtectedRoute roles={["student"]}><StudentActivityDetailsPage /></ProtectedRoute>}
        />
        <Route
          path="/student/activities/:activityId/submit"
          element={<ProtectedRoute roles={["student"]}><StudentSubmissionPage /></ProtectedRoute>}
        />
        <Route
          path="/student/classes/:classId/activities/:activityId/submit"
          element={<ProtectedRoute roles={["student"]}><StudentSubmissionPage /></ProtectedRoute>}
        />

        {/* Shared preview */}
        <Route
          path="/documents/:documentType/:documentId"
          element={
            <ProtectedRoute roles={["student", "teacher"]}>
              <DocumentViewerPage />
            </ProtectedRoute>
          }
        />

        {/* Teacher pages */}
        <Route
          path="/teacher/teacher_screen"
          element={<Navigate to="/teacher/teacher_screen/home" replace />}
        />
        <Route
          path="/teacher/submissions/:submissionId"
          element={<ProtectedRoute roles={["teacher"]}><SubmissionDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/teacher/submissions/:submissionId/analysis"
          element={<ProtectedRoute roles={["teacher"]}><SubmissionAnalysisReportPage /></ProtectedRoute>}
        />
        <Route
          path="/teacher/integrity-analytics"
          element={<ProtectedRoute roles={["teacher"]}><IntegrityAnalyticsPage /></ProtectedRoute>}
        />
        <Route
          path="/teacher/analytics"
          element={<Navigate to="/teacher/integrity-analytics" replace />}
        />
        <Route
          path="/teacher/activities/:activityId"
          element={<ProtectedRoute roles={["teacher"]}><TeacherScreen /></ProtectedRoute>}
        />
        <Route
          path="/teacher/teacher_screen/:section"
          element={<ProtectedRoute roles={["teacher"]}><TeacherScreen /></ProtectedRoute>}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth/login_screen" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function OfflineRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { online } = useNetworkStatus();
  const offlineAnchorPathRef = useRef<string | null>(null);
  const lastBlockedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (online) {
      offlineAnchorPathRef.current = null;
      lastBlockedPathRef.current = null;
      return;
    }

    const currentPath = `${location.pathname}${location.search}`;
    offlineAnchorPathRef.current ??= currentPath;

    if (
      currentPath !== offlineAnchorPathRef.current &&
      !canAccessRouteOffline(location.pathname)
    ) {
      if (lastBlockedPathRef.current !== currentPath) {
        toast.error("Internet access is required to open that page.");
        lastBlockedPathRef.current = currentPath;
      }

      navigate("/offline", {
        replace: true,
        state: { blockedPath: currentPath },
      });
    }
  }, [location.pathname, location.search, navigate, online]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineRouteGuard>
        <AnimatedRoutes />
      </OfflineRouteGuard>
    </BrowserRouter>
  );
}
