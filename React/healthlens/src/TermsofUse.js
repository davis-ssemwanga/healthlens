import React from "react";
import "./LoginPage.css";

const TermsOfUse = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Terms of Use</h2>
        <p>Welcome to our healthcare system. By using our services, you agree to the following terms and conditions:</p>
        <ul>
          <li>You must provide accurate and complete information when signing up.</li>
          <li>Unauthorized access or misuse of the system is strictly prohibited.</li>
          <li>Your data will be handled in accordance with our Privacy Policy.</li>
          <li>We reserve the right to update these terms at any time.</li>
        </ul>
        <p>If you do not agree with these terms, please do not use our services.</p>
        <p><a href="/privacy" className="link">Read our Privacy Policy</a>|
        <a href="/signin" className="link"> Signin</a>
        </p>
      </div>
    </div>
  );
};

export default TermsOfUse;
