import React, { useState, useEffect } from 'react';
import * as api from '../api';
import './Appointments.css';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [newAppointment, setNewAppointment] = useState({ date: '' });
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const fetchAppointments = async () => {
    try {
      const data = await api.getUserAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const auth = await api.verifyAuth();
        setRole(auth.role);
        setUserId(auth.id);

        const allUsers = await api.getUsers();
        setUsers(allUsers);

        fetchAppointments();
      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setLoading(false);
      }
    };
    initialize();

    // Set up polling to refresh appointments every 5 seconds
    const interval = setInterval(fetchAppointments, 3000);

    // Cleanup polling on component unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this runs once when the component mounts

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAppointment((prev) => ({ ...prev, [name]: value }));
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let appointmentData = { date: new Date(newAppointment.date).toISOString() };
      if (role === 'patient') {
        appointmentData = {
          ...appointmentData,
          patient: userId,
          doctor: newAppointment.selectedUser,
          approval_status_patient: 'approved',
          approval_status_doctor: 'waiting',
        };
      } else if (role === 'doctor') {
        appointmentData = {
          ...appointmentData,
          doctor: userId,
          patient: newAppointment.selectedUser,
          approval_status_doctor: 'approved',
          approval_status_patient: 'waiting',
        };
      }
      await api.createAppointment(appointmentData);
      setNewAppointment({ date: '' });
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (appointmentId, status) => {
    try {
      await api.updateAppointmentApproval(appointmentId, role, status);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };

  const renderCalendarView = () => {
    if (!appointments.length) return <p>No appointments to display.</p>;
    const groupedByDate = appointments.reduce((acc, appt) => {
      const date = new Date(appt.date).toDateString();
      acc[date] = acc[date] || [];
      acc[date].push(appt);
      return acc;
    }, {});

    return (
      <div className="calendar-view">
        {Object.entries(groupedByDate).map(([date, appts]) => (
          <div key={date} className="calendar-day">
            <h4>{date}</h4>
            {appts.map((appt, idx) => {
              const otherPartyId = role === 'patient' ? appt.doctor : appt.patient;
              const otherParty = users.find(u => u.id === otherPartyId) || {};
              const myApproval = role === 'patient' ? appt.approval_status_patient : appt.approval_status_doctor;
              const otherApproval = role === 'patient' ? appt.approval_status_doctor : appt.approval_status_patient;
              return (
                <div key={idx} className="appointment-slot">
                  {new Date(appt.date).toLocaleTimeString()} - 
                  {role === 'patient' ? 'Doctor' : 'Patient'}: {otherParty.first_name || 'Unknown'} {otherParty.last_name || ''} - 
                  Status: {appt.status} 
                  {myApproval === 'waiting' && (
                    <>
                      <button onClick={() => handleApproval(appt.id, 'approved')}>Approve</button>
                      <button onClick={() => handleApproval(appt.id, 'declined')}>Decline</button>
                    </>
                  )}
                  {myApproval !== 'waiting' && otherApproval === 'waiting' && (
                    <span> (Awaiting {role === 'patient' ? 'Doctor' : 'Patient'} Approval)</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-card">
      <h3>Appointments</h3>
      <form className="appointment-form" onSubmit={createAppointment}>
        <select
          name="selectedUser"
          value={newAppointment.selectedUser || ''}
          onChange={handleInputChange}
          required
        >
          <option value="">{role === 'patient' ? 'Select Doctor' : 'Select Patient'}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          name="date"
          value={newAppointment.date}
          onChange={handleInputChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Appointment'}
        </button>
      </form>
      <div className="card-content">
        {loading ? <p>Loading appointments...</p> : renderCalendarView()}
      </div>
    </div>
  );
}

export default Appointments;
