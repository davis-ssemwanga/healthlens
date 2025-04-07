import React, { useState, useEffect, useRef } from "react";
import AIModel from "./AIModel";
import Video from "./Video";
import Chat from "./Chat";
import Report from "./Report";
import Settings from "./Settings";
import Appointments from "./Appointments";
import logo from "./assets/logo.jpg";
import "../App.css";
import {
  FaSignOutAlt,
  FaRobot,
  FaVideo,
  FaComments,
  FaFileAlt,
  FaCog,
  FaCalendarAlt,
  FaBars,
} from "react-icons/fa";
import Cookies from "js-cookie";
import { createWebSocketConnection } from "../api";

function PatientDashboard() {
  const [activeComponent, setActiveComponent] = useState("aimodel");
  const [incomingCall, setIncomingCall] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const socketRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const socket = createWebSocketConnection();
    socketRef.current = socket;

    socket.onopen = () =>
      console.log("WebSocket connection established in PatientDashboard.");
    socket.onclose = () =>
      console.log("WebSocket connection closed in PatientDashboard.");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "incoming-call") {
        setIncomingCall(message);
      }
    };

    return () => {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    setIsNavVisible(false);
  }, [activeComponent]);

  const handleLogout = () => {
    Cookies.remove("auth_token");
    window.location.href = "/signin";
  };

  const acceptCall = (signalData, fromUserId, callSessionId) => {
    socketRef.current.send(
      JSON.stringify({
        type: "call-accepted",
        userId: fromUserId,
        signalData,
        callSessionId,
      })
    );
    setIncomingCall(null);
    setActiveComponent("video");
  };

  const rejectCall = () => {
    setIncomingCall(null);
  };

  const handleAcceptCallFromOverlay = (
    signalData,
    fromUserId,
    callSessionId
  ) => {
    if (videoRef.current && isVideoReady) {
      videoRef.current.handleAcceptCall(signalData, fromUserId, callSessionId);
      acceptCall(signalData, fromUserId, callSessionId);
    } else {
      console.warn("Video component not ready yet. Switching to video...");
      setActiveComponent("video");
      const waitForVideo = setInterval(() => {
        if (videoRef.current && isVideoReady) {
          videoRef.current.handleAcceptCall(
            signalData,
            fromUserId,
            callSessionId
          );
          acceptCall(signalData, fromUserId, callSessionId);
          clearInterval(waitForVideo);
        }
      }, 100);
    }
  };

  const handleVideoReady = () => {
    setIsVideoReady(true);
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case "aimodel":
        return <AIModel modelType="patient_analytics" />;
      case "video":
        return (
          <Video
            ref={videoRef}
            socketRef={socketRef}
            acceptCall={acceptCall}
            rejectCall={rejectCall}
            onReady={handleVideoReady}
          />
        );
      case "chat":
        return <Chat />;
      case "report":
        return <Report />;
      case "settings":
        return <Settings />;
      case "appointments":
        return <Appointments />;
      default:
        return <AIModel modelType="patient_analytics" />;
    }
  };
  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => toggleNav()}>
            <FaBars />
          </button>
          <img src={logo} alt="Logo" className="logo" />
        </div>
        <h2 className="dashboard-title">Patient Dashboard</h2>
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
            className={activeComponent === "video" ? "active" : ""}
            onClick={() => setActiveComponent("video")}
          >
            <FaVideo /> Video
          </button>
          <button
            className={activeComponent === "chat" ? "active" : ""}
            onClick={() => setActiveComponent("chat")}
          >
            <FaComments /> Chat
          </button>
          <button
            className={activeComponent === "report" ? "active" : ""}
            onClick={() => setActiveComponent("report")}
          >
            <FaFileAlt /> Report
          </button>
          <button
            className={activeComponent === "settings" ? "active" : ""}
            onClick={() => setActiveComponent("settings")}
          >
            <FaCog /> Settings
          </button>
          <button
            className={activeComponent === "appointments" ? "active" : ""}
            onClick={() => setActiveComponent("appointments")}
          >
            <FaCalendarAlt /> Appointments
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </nav>

        <div className="content">{renderComponent()}</div>
      </div>
      {incomingCall && (
        <div className="incoming-call-overlay">
          <h2>Incoming Call from {incomingCall.fromUserName}</h2>
          <button
            onClick={() =>
              handleAcceptCallFromOverlay(
                incomingCall.signalData,
                incomingCall.fromUserId,
                incomingCall.callSessionId
              )
            }
          >
            Accept
          </button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
