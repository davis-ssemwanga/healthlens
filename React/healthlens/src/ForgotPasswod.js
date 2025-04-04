import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "./api";
//import logo from "../assets/logo.png";
import "./LoginPage.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await resetPassword({ email });
      setMessage("A password reset link has been sent to your email.");
    } catch (err) {
      setError("Failed to send reset link. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="{logo}" alt="Logo" className="login-logo" />
        <h2 className="login-title">Forgot Password</h2>
        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}
        <div className="login-form">
          <form onSubmit={handleReset}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button">Send Reset Link</button>
          </form>
          <div className="login-links">
            <p>
              <a href="/login" className="link">Back to Login</a>
            </p>
            <p>
              <a href="/signup" className="link">Create Account</a>
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

export default ForgotPasswordPage;
