import React from "react";
import "./LoginPage.css";

const PrivacyPolicy = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Privacy Policy</h2>
        <p>We value your privacy and are committed to protecting your personal data. This policy outlines how we collect, use, and safeguard your information.</p>
        <ul>
          <li>We collect personal data to provide better healthcare services.</li>
          <li>Your data is securely stored and will not be shared without consent.</li>
          <li>You have the right to access, update, or delete your personal data.</li>
          <li>We may update this policy to reflect changes in our practices.</li>
        </ul>
        <p>If you have any concerns about your privacy, please contact us.</p>
        <p><a href="/terms" className="link">Read our Terms of Use</a>
        |
        <a href="/signin" className="link"> Signin</a>
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
