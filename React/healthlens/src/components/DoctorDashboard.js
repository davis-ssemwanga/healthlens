import React, { useState, useEffect, useRef } from "react";
import AIModel from "./AIModel";
import Video from "./Video";
import Chat from "./Chat";
import Report from "./Report";
import Settings from "./Settings";
import Appointments from "./Appointments";
import "../App.css";
import {
  FaSignOutAlt,
  FaRobot,
  FaVideo,
  FaComments,
  FaFileAlt,
  FaCog,
  FaCalendar,
} from "react-icons/fa";
import Cookies from "js-cookie";
import { createWebSocketConnection } from "../api";

function DoctorDashboard() {
  const [activeComponent, setActiveComponent] = useState("aimodel");
  const [incomingCall, setIncomingCall] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const socketRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const socket = createWebSocketConnection();
    socketRef.current = socket;

    socket.onopen = () => console.log("WebSocket connection established.");
    socket.onclose = () => console.log("WebSocket connection closed.");
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
        return <AIModel modelType="doctor_analytics" />;
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
        return <AIModel modelType="doctor_analytics" />;
    }
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <img src="/logo.png" alt="Logo" className="logo" />
          <h2 className="dashboard-title">Doctor Dashboard</h2>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt /> Logout
        </button>
      </header>
      <div className="dashboard-body">
        <nav className="nav">
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
            <FaCalendar /> Appointments {/* Confirmed: Using FaCalendar */}
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

export default DoctorDashboard;
