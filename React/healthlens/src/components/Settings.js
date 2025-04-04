import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile } from '../api';
import "./Settings.css";

const Settings = () => {
  const [profile, setProfile] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    newPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
        setFormData({
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          date_of_birth: data.date_of_birth || '',
          newPassword: '',
        });
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedData = await updateUserProfile(formData);
      setProfile(updatedData); // Update displayed profile
      setError(null);
      alert('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="settings-container">
      <h2>Settings</h2>
      <div>
        <p><strong>Username:</strong> {profile.username}</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>First Name:</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Last Name:</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Date of Birth:</label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>New Password:</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
};

export default Settings;