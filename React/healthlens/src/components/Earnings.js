import React, { useState, useEffect } from "react";
import * as api from "../api";
import "./Earnings.css";

function Earnings() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchEarnings = async () => {
    try {
      const data = await api.getEarningsSummary();
      console.log("Fetched earnings:", data); // Debug
      setEarnings(data);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      setEarnings({ daily: 0, weekly: 0, monthly: 0 }); // Fallback
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const auth = await api.verifyAuth();
        if (auth.isAuthenticated && auth.role === "doctor") {
          setRole(auth.role);
          setUserId(auth.id);
          await fetchEarnings();
        }
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setLoading(false);
      }
    };
    initialize();

    const interval = setInterval(() => {
      fetchEarnings(); // Refresh every 5 minutes (300,000ms)
    }, 300000);

    return () => clearInterval(interval);
  }, [refreshTrigger]);

  if (loading) return <p>Loading earnings...</p>;
  if (role !== "doctor" || !earnings) return null;

  return (
    <div className="dashboard-card earnings-card">
      <h3>Earnings</h3>
      <button onClick={() => setRefreshTrigger((prev) => prev + 1)}>
        Refresh Earnings
      </button>
      <div className="earnings-table">
        <h4>Current Period</h4>
        <table>
          <thead>
            <tr>
              <th>Today (Past Appointments)</th>
              <th>This Week (Mon-Fri)</th>
              <th>Last 4 Weeks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>UGX. {earnings.daily.toFixed(2)}</td>
              <td>UGX. {earnings.weekly.toFixed(2)}</td>
              <td>UGX. {earnings.monthly.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Earnings;
