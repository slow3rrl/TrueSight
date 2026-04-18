import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginScreen from "./auth/LoginScreen";
import SignupScreen from "./auth/SignupScreen";
import StudentScreen from "./screens/student/StudentScreen";
import TeacherScreen from "./screens/teacher/TeacherScreen";
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
        <Route path="/teacher/teacher_screen/:section" element={<TeacherScreen />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth/login_screen" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
