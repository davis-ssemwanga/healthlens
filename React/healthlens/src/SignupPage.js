import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, verifyAuth } from "./api";
import "./LoginPage.css";
import logo from "./components/assets/logo.jpg"

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient", // Default role
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await verifyAuth();
        if (authStatus.isAuthenticated) {
          navigate(`/${authStatus.role}`);
        }
      } catch (error) {
        // Stay on signup page
      }
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...dataToSend } = formData; // Exclude confirmPassword
      const response = await registerUser(dataToSend);
      
      if (response && response.role) {
        navigate(`/${response.role}`); // Redirect to role-based dashboard
      } else {
        navigate("/signin"); // Fallback to login page
      }
    } catch (err) {
      setError(err.error || err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
      <img src={logo} alt="Logo" className="login-logo" />
      <h2 className="login-title">AI Telemedicine</h2>
        Create an Account
        {error && <p className="login-error">{error}</p>}
        <div className="login-form">
          <form onSubmit={handleSignup}>
            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Registering..." : "Sign Up"}
            </button>
          </form>
          <div className="login-links">
            <p>
              Already have an account? <a href="/signin" className="link">Sign In</a>
            </p>
            <p>
              <a href="/terms" className="link">Terms of Use</a> |{" "}
              <a href="/privacy" className="link">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
