import React, { useState, useEffect } from "react";
import logo from "./assets/logo.jpg";
import AIModel from "./AIModel";
import DoctorActivity from "./DoctorActivity";
import Settings from "./Settings";
import "../App.css"; // Global styles applied to all dashboards
import { FaUserMd, FaRobot, FaCog, FaSignOutAlt, FaBars } from "react-icons/fa";
import Cookies from "js-cookie";

function ManagerDashboard() {
  const [activeComponent, setActiveComponent] = useState("aimodel");
  const [isNavVisible, setIsNavVisible] = useState(true); // Control nav visibility

  useEffect(() => {
    setIsNavVisible(false);
  }, [activeComponent]);

  const renderComponent = () => {
    switch (activeComponent) {
      case "aimodel":
        return <AIModel modelType="operational_analytics" />;
      case "doctor":
        return <DoctorActivity />;
      case "settings":
        return <Settings />;
      default:
        return <AIModel modelType="operational_analytics" />;
    }
  };

  const handleLogout = () => {
    Cookies.remove("auth_token");
    window.location.href = "/signin";
  };

  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={toggleNav}>
            <FaBars />
          </button>
          <img src={logo} alt="Logo" className="logo" />
        </div>
        <h2 className="dashboard-title">Manager Dashboard</h2>
      </header>

      <div className="dashboard-body">
        <nav className={`nav ${isNavVisible ? "show" : ""}`}>
          <button
            className={activeComponent === "aimodel" ? "active" : ""}
            onClick={() => setActiveComponent("aimodel")}
          >
            <FaRobot /> AI Model
          </button>
          <button
            className={activeComponent === "doctor" ? "active" : ""}
            onClick={() => setActiveComponent("doctor")}
          >
            <FaUserMd /> Doctors
          </button>
          <button
            className={activeComponent === "settings" ? "active" : ""}
            onClick={() => setActiveComponent("settings")}
          >
            <FaCog /> Settings
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </nav>
        <div className="content">{renderComponent()}</div>
      </div>
    </div>
  );
}

export default ManagerDashboard;
