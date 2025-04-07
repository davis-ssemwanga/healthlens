import React, { useState, useEffect } from "react";
import * as api from "../api";
import "./Appointments.css";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    date: "",
    selectedUser: "",
  });
  const [availability, setAvailability] = useState([]);
  const [newAvailability, setNewAvailability] = useState({
    date: "",
    start_time: "",
    end_time: "",
    appointment_duration: 30,
    fee: "",
  });
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const fetchAppointments = async () => {
    try {
      const data = await api.getUserAppointments();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchAvailability = async (doctorId) => {
    try {
      const data = await api.getDoctorAvailability(doctorId);
      console.log("Fetched availability:", data); // Debug availability
      setAvailability(data);
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const auth = await api.verifyAuth();
        console.log("Auth response:", auth);
        if (auth.isAuthenticated) {
          setRole(auth.role);
          setUserId(auth.id);
          console.log("Set userId to:", auth.id);

          const allUsers = await api.getUsers();
          setUsers(allUsers.filter((u) => u.role !== auth.role));

          fetchAppointments();

          // Fetch availability for doctor or all doctors in appointments
          if (auth.role === "doctor") {
            fetchAvailability(auth.id);
          } else if (auth.role === "patient") {
            const doctorIds = [
              ...new Set(
                (await api.getUserAppointments()).map((a) => a.doctor)
              ),
            ];
            const availPromises = doctorIds.map((id) =>
              api.getDoctorAvailability(id)
            );
            const availData = await Promise.all(availPromises);
            setAvailability(availData.flat()); // Flatten array of arrays
          }
        }
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setLoading(false);
      }
    };
    initialize();

    const interval = setInterval(() => {
      fetchAppointments();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
              const otherPartyId =
                role === "patient" ? appt.doctor : appt.patient;
              const otherParty = users.find((u) => u.id === otherPartyId) || {};
              const myApproval =
                role === "patient"
                  ? appt.approval_status_patient
                  : appt.approval_status_doctor;
              const otherApproval =
                role === "patient"
                  ? appt.approval_status_doctor
                  : appt.approval_status_patient;
              const fee =
                availability.find(
                  (a) =>
                    a.date ===
                      new Date(appt.date).toISOString().split("T")[0] &&
                    a.doctor === appt.doctor
                )?.fee || 50;

              return (
                <div key={idx} className="appointment-slot">
                  {new Date(appt.date).toLocaleTimeString()} -
                  {role === "patient" ? "Doctor" : "Patient"}:{" "}
                  {otherParty.first_name || "Unknown"}{" "}
                  {otherParty.last_name || ""} - Fee per 15 minutes: UGX{fee} -
                  Status: {appt.status}
                  {myApproval === "waiting" && (
                    <>
                      <button
                        onClick={() => handleApproval(appt.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(appt.id, "declined")}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {myApproval !== "waiting" && otherApproval === "waiting" && (
                    <span>
                      {" "}
                      (Awaiting {role === "patient" ? "Doctor" : "Patient"}{" "}
                      Approval)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`); // Debug input changes
    setNewAppointment((prev) => ({ ...prev, [name]: value }));
    if (name === "selectedUser" && role === "patient") {
      fetchAvailability(value);
    }
  };

  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setNewAvailability((prev) => ({ ...prev, [name]: value }));
  };

  const generateTimeSlots = (avail) => {
    if (!avail) return [];
    const slots = [];
    let current = new Date(`2023-01-01T${avail.start_time}`);
    const end = new Date(`2023-01-01T${avail.end_time}`);
    while (current < end) {
      const timeStr = current.toTimeString().slice(0, 5); // "HH:MM" in 24-hour format
      slots.push(timeStr);
      current.setMinutes(current.getMinutes() + avail.appointment_duration);
    }
    return slots;
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("Submitting appointment with date:", newAppointment.date);
      if (!newAppointment.date) {
        throw new Error("Please select a valid date and time");
      }
      const dateTime = new Date(newAppointment.date);
      if (isNaN(dateTime.getTime())) {
        throw new Error("Invalid date format");
      }
      let appointmentData = { date: dateTime.toISOString() }; // Sends UTC, e.g., "2025-04-07T08:00:00Z"
      if (role === "patient") {
        appointmentData = {
          ...appointmentData,
          patient: userId,
          doctor: newAppointment.selectedUser,
          approval_status_patient: "approved",
          approval_status_doctor: "waiting",
        };
      } else if (role === "doctor") {
        appointmentData = {
          ...appointmentData,
          doctor: userId,
          patient: newAppointment.selectedUser,
          approval_status_doctor: "approved",
          approval_status_patient: "waiting",
        };
      }
      console.log("Appointment data sent:", appointmentData); // Debug
      await api.createAppointment(appointmentData);
      setNewAppointment({ date: "", selectedUser: "" });
      fetchAppointments();
    } catch (error) {
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data.detail
      ) {
        alert(error.response.data.detail); // e.g., "Appointment time is outside doctor's availability."
      } else {
        alert("An unexpected error occurred. Please try again.");
        console.error(
          "Error creating appointment:",
          error.response?.data || error.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const createAvailability = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("Creating availability with userId:", userId);
    try {
      await api.createDoctorAvailability({
        doctor: userId,
        date: newAvailability.date,
        start_time: newAvailability.start_time,
        end_time: newAvailability.end_time,
        appointment_duration: parseInt(newAvailability.appointment_duration),
        fee: parseFloat(newAvailability.fee),
      });
      setNewAvailability({
        date: "",
        start_time: "",
        end_time: "",
        appointment_duration: 30,
        fee: "",
      });
      fetchAvailability(userId);
    } catch (error) {
      console.error(
        "Error creating availability:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (appointmentId, status) => {
    try {
      await api.updateAppointmentApproval(appointmentId, role, status);
      fetchAppointments();
    } catch (error) {
      console.error("Error updating approval:", error);
    }
  };

  const renderAvailabilityForm = () => {
    if (role !== "doctor") return null;
    return (
      <form className="availability-form" onSubmit={createAvailability}>
        <h4>Set Availability</h4>
        <input
          type="date"
          name="date"
          value={newAvailability.date}
          onChange={handleAvailabilityChange}
          required
        />
        <input
          type="time"
          name="start_time"
          value={newAvailability.start_time}
          onChange={handleAvailabilityChange}
          required
        />
        <input
          type="time"
          name="end_time"
          value={newAvailability.end_time}
          onChange={handleAvailabilityChange}
          required
        />
        <input
          type="number"
          name="appointment_duration"
          value={newAvailability.appointment_duration}
          onChange={handleAvailabilityChange}
          min="15"
          step="15"
          max="240"
          required
        />
        <input
          type="number"
          name="fee"
          value={newAvailability.fee}
          onChange={handleAvailabilityChange}
          placeholder="Fee per 15 minutes(UGX)"
          step="1000"
          min="0"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Set Availability"}
        </button>
      </form>
    );
  };

  return (
    <div className="dashboard-card">
      <h3>Appointments</h3>
      {renderAvailabilityForm()}
      <form className="appointment-form" onSubmit={createAppointment}>
        <select
          name="selectedUser"
          value={newAppointment.selectedUser}
          onChange={handleInputChange}
          required
        >
          <option value="">
            {role === "patient" ? "Select Doctor" : "Select Patient"}
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </option>
          ))}
        </select>
        {role === "patient" && availability.length > 0 && (
          <select
            name="date"
            value={newAppointment.date}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Time Slot</option>
            {availability.map((avail) =>
              generateTimeSlots(avail).map((slot, idx) => {
                const slotValue = `${avail.date}T${slot}:00`; // Full ISO format
                return (
                  <option key={idx} value={slotValue}>
                    {avail.date} - {slot} (Fee per 15 minutes: UGX. {avail.fee})
                  </option>
                );
              })
            )}
          </select>
        )}
        {role === "doctor" && (
          <input
            type="datetime-local"
            name="date"
            value={newAppointment.date}
            onChange={handleInputChange}
            required
          />
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Appointment"}
        </button>
      </form>
      <div className="card-content">
        {loading ? <p>Loading...</p> : renderCalendarView()}
      </div>
    </div>
  );
}

export default Appointments;
