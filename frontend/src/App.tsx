import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginScreen from "./auth/LoginScreen";
import SignupScreen from "./auth/SignupScreen";
import StudentScreen from "./screens/student/StudentScreen";
import TeacherScreen from "./screens/teacher/TeacherScreen";
import SubmissionDetailPage from "./screens/teacher/SubmissionDetailPage";
import SubmissionAnalysisReportPage from "./screens/teacher/SubmissionAnalysisReportPage";
import IntegrityAnalyticsPage from "./screens/teacher/IntegrityAnalyticsPage";
import "./index.css";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/auth/login_screen" replace />} />

        {/* Auth routes */}
        <Route path="/auth/login_screen" element={<LoginScreen />} />
        <Route path="/auth/signup_screen" element={<SignupScreen />} />

        {/* Protected pages for now */}
        <Route path="/student/student_screen" element={<StudentScreen />} />
        <Route
          path="/teacher/teacher_screen"
          element={<Navigate to="/teacher/teacher_screen/home" replace />}
        />
        <Route path="/teacher/submissions/:submissionId" element={<SubmissionDetailPage />} />
        <Route
          path="/teacher/submissions/:submissionId/analysis"
          element={<SubmissionAnalysisReportPage />}
        />
        <Route path="/teacher/integrity-analytics" element={<IntegrityAnalyticsPage />} />
        <Route path="/teacher/teacher_screen/:section" element={<TeacherScreen />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth/login_screen" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
