import "./Home.css";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { Navigate } from "react-router-dom";
import logo from "./assets/logo.jpg";

function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach((item) => {
      item.querySelector("h3").addEventListener("click", () => {
        item.classList.toggle("active");
      });
    });
  }, []);

  const handleSignup = () => {
    navigate("/sign-up");
  };

  const handleSignin = () => {
    navigate("/signin");
  };

  return (
    <div className="home-container">
      <header className="headers">
        <div className="top-bar">
          <div className="hero-image">
            <img src={logo} alt="Telemedicine AI" />
          </div>
          <div className="logo">
            <h1>AI Telemedicine</h1>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-text">
          <h1>Welcome to AI-Powered Telemedicine</h1>
          <h2>Revolutionizing Healthcare with AI</h2>
          <p>
            Experience seamless healthcare access with AI-driven consultations,
            remote monitoring, and more. Connecting you with expert care,
            powered by AI. Serving the Mbarara region and surrounding areas.
          </p>
          <div className="auth-buttons">
            <button className="signin-btn" onClick={handleSignin}>
              Access Your Account
            </button>
            <button className="signup-btn" onClick={handleSignup}>
              Get Started Today
            </button>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Our Core Features</h2>
        <div className="feature-item">
          <h3>AI-Powered Diagnostics</h3>
          <p>
            Advanced AI models to analyze symptoms and suggest possible
            conditions.
          </p>
        </div>
        <div className="feature-item">
          <h3>Certified Doctors</h3>
          <p>
            Connect with experienced and certified medical professionals
            instantly.
          </p>
        </div>
        <div className="feature-item">
          <h3>24/7 Availability</h3>
          <p>Access healthcare anytime, anywhere, at your convenience.</p>
        </div>
      </section>

      <section className="about">
        <h2>Why Choose Us?</h2>
        <p>
          Developed by a team of three individuals, this platform utilizes React
          for the frontend, Django for the backend, and TensorFlow for AI
          diagnostics. Our focus is on user-friendly interfaces and cutting-edge
          AI for instant, accurate health assessments. Our AI diagnostic system
          uses machine learning models trained on extensive medical datasets.
        </p>
        <p>
          Vision: To make quality healthcare accessible to everyone in the
          Mbarara region, regardless of location.
        </p>
        <p>
          Potential Benefits: Reduced wait times, increased access to
          specialists, potential for early disease detection, and
          cost-effectiveness.
        </p>
      </section>
      <h2 className="t">Our Services</h2>
      <section className="services-grid">
        <div className="service-item">
          <h3>Instant Video Consultations</h3>
          <p>
            Book and attend video consultations with top healthcare providers.
          </p>
        </div>
        <div className="service-item">
          <h3>Prescription Management</h3>
          <p>
            Get prescriptions digitally and manage your medications with ease.
          </p>
        </div>
        <div className="service-item">
          <h3>Health Records</h3>
          <p>Securely store and access your medical history from anywhere.</p>
        </div>
        <div className="service-item">
          <h3>Symptom Checker</h3>
          <p>
            Use our AI-powered symptom checker for quick preliminary diagnoses.
          </p>
        </div>
      </section>

      <section className="testimonials">
        <h2>What Our Users Say</h2>
        <div className="testimonial-item">
          <blockquote>
            "This platform has transformed the way I access healthcare.
            Convenient and reliable!"
          </blockquote>
          <cite>- Mark J.</cite>
        </div>
        <div className="testimonial-item">
          <blockquote>
            "AI diagnostics gave me a head start on my condition before seeing a
            doctor."
          </blockquote>
          <cite>- Fortunate A.</cite>
        </div>
      </section>

      <section className="faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>How does the AI diagnostic system work?</h3>
          <p>
            The AI system analyzes your symptoms and suggests possible
            conditions based on a vast database of medical information.
          </p>
        </div>
        <div className="faq-item">
          <h3>Can I trust the AI recommendations?</h3>
          <p>
            Yes, our AI is trained on millions of medical records and regularly
            updated to provide accurate suggestions. However, it's always
            advisable to consult with a certified doctor for a final diagnosis.
          </p>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <p>
            © 2025 AI Telemedicine. All rights reserved. | A Project by Mark
            Kigozi, Davis Ssemwanga and Martin Mugisha
          </p>
          <p>
            Technology Stack: React, Django, TensorFlow, PostgreSQL. | Data
            Privacy Commitment: User data is handled with strict
            confidentiality.
          </p>
          <p>
            Future Development: Integration with wearable devices, expansion to
            include mental health services.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
