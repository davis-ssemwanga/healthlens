import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, verifyAuth } from "./api";
import Cookies from 'js-cookie';
import logo from "./components/assets/logo.jpg";
import "./LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await verifyAuth();
        if (authStatus.isAuthenticated) {
          navigate(`/${authStatus.role}`);
        }
      } catch (error) {
        // User is not authenticated, stay on login page
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await loginUser({ email, password });
      const role = response.user.role; // Get role from response
      console.log(role)
      navigate(`/${role}`); // Redirect to role-specific dashboard
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    }
  };
  


  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2 className="login-title">AI Telemedicine</h2>
        Sign In
        {error && <p className="login-error">{error}</p>}
        <div className="login-form">
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button">Sign In</button>
          </form>
          <div className="login-links">
            <p>
              <a href="/forgot-password" className="link">Forgot Password?</a>
            </p>
            <p>
              Don't have an account? <a href="/sign-up" className="link">Create Account</a>
            </p>
            <p>
              <a href="/terms" className="link">Terms of Use</a> | <a href="/privacy" className="link">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
