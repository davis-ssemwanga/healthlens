import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { verifyAuth } from "./api";
import PatientDashboard from "./components/PatientDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import Home from "./components/Home";
import "./App.css";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import ForgotPasswordPage from "./ForgotPasswod";
import TermsOfUse from "./TermsofUse";
import PrivacyPolicy from "./PrivacyOfPolicy";
import { useLocation } from "react-router-dom"; // Import useLocation for checking current path

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      if (location.pathname === "/signin" || location.pathname === "/sign-up") {
        setLoading(false);
        return;
      }

      try {
        const status = await verifyAuth();
        console.log("verifyAuth response:", status); // Debug
        setAuthStatus(status);
      } catch (error) {
        console.error("verifyAuth error:", error); // Debug
        setAuthStatus({ isAuthenticated: false, role: null });
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Public routes: render children immediately
  if (location.pathname === "/signin" || location.pathname === "/sign-up") {
    return children;
  }

  // If not authenticated, redirect to signin (but not if already on signin)
  if (!authStatus?.isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (!allowedRoles.includes(authStatus.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} /> {/* Public route */}
        <Route path="/sign-up" element={<SignupPage />} /> {/* Public route */}
        <Route path="/signin" element={<LoginPage />} /> {/* Public route */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />{" "}
        {/* Public route */}
        <Route path="/privacy" element={<PrivacyPolicy />} />{" "}
        {/* Public route */}
        <Route path="/terms" element={<TermsOfUse />} /> {/* Public route */}
        {/* Protected routes */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        {/* Redirect to home for any other route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
