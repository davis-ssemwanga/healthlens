import React, { useState, useEffect } from 'react'; 
import { addDoctor, getDoctors, updateDoctorAvailability } from '../api';
import './DoctorActivity.css'; 

function DoctorActivity() {
  const [activeTab, setActiveTab] = useState('addDoctor');
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    specialty: '',
    experience: '',
  });
  const [editId, setEditId] = useState(null);

  // Fetch doctors on mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
      setFilteredDoctors(data); // Initially, all doctors are shown
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };
  
  const handleSearch = debounce((e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = doctors.filter(doctor => {
      const { user, specialty } = doctor;
      return (
        user.username.toLowerCase().includes(query) ||
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        specialty.toLowerCase().includes(query)
      );
    });
    setFilteredDoctors(filtered);
  }, 300); // 300ms delay

  const handleAvailabilityChange = async (doctorId, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'on_leave' : 'available';
    try {
      await updateDoctorAvailability(doctorId, newStatus);
      // Update filteredDoctors state to reflect the change immediately
      setFilteredDoctors(prevDoctors =>
        prevDoctors.map(doctor =>
          doctor.id === doctorId ? { ...doctor, availability_status: newStatus } : doctor
        )
      );
      console.log('Availability updated successfully');
    } catch (error) {
      console.error('Error updating doctor availability:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'experience') {
      newValue = isNaN(value) ? '' : Number(value); // Convert experience to number if valid
    }
    setFormData({ ...formData, [name]: newValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataCopy = { ...formData };
    formDataCopy.experience = Number(formDataCopy.experience);
    try {
      await addDoctor(formDataCopy);
      alert('Doctor added successfully!');
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        specialty: '',
        experience: '',
      });
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        alert(`Error: ${JSON.stringify(errorData)}`);
      } else {
        alert('Failed to add doctor.');
      }
      console.error('Error adding doctor:', errorData || error.message);
    }
  };

  return (
    <div className="doctor-activity-container">
      <div className="sidebar">
        <ul>
          <li onClick={() => setActiveTab('addDoctor')}>Add Doctor</li>
          <li onClick={() => setActiveTab('viewActivity')}>View Doctors</li>
          <li onClick={() => setActiveTab('available')}>Available Doctors</li>
        </ul>
      </div>

      <div className="main-content">
        {activeTab === 'addDoctor' && 
          <div className="add-doctor-container">
            <h2>Add Doctor</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
              <input type="text" name="first_name" placeholder="First Name" onChange={handleChange} required />
              <input type="text" name="last_name" placeholder="Last Name" onChange={handleChange} required />
              <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
              <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
              <input type="text" name="specialty" placeholder="Specialty" onChange={handleChange} />
              <input type="number" name="experience" placeholder="Years of Experience" onChange={handleChange} />
              <button type="submit">Add Doctor</button>
            </form>
          </div>
        }

        {activeTab === 'viewActivity' && 
          <div>
            <h2>View Doctors</h2>
            <input
              type="text"
              placeholder="Search doctors by name, username, or specialty..."
              value={searchQuery}
              onChange={handleSearch}
              style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
            />
            {filteredDoctors.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Username</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>First Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Last Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Specialty</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Experience (Years)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map(doctor => (
                    <tr key={doctor.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.username}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.first_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.last_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.email}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {doctor.doctor ? doctor.doctor.specialty : 'N/A'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {doctor.doctor ? doctor.doctor.years_of_experience : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No doctors found matching your search.</p>
            )}
          </div>
        }

        {activeTab === 'available' && (
          <div>
            <h2>Available Doctors</h2>
            <input
              type="text"
              placeholder="Search doctors by name, username, or specialty..."
              value={searchQuery}
              onChange={handleSearch}
              style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
            />
            {filteredDoctors.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Username</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Availability Status</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map(doctor => (
                    <tr key={doctor.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.username}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.email}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{doctor.doctor.availability_status}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <button onClick={() => handleAvailabilityChange(doctor.doctor.id, doctor.doctor.availability_status)}>
                          Change Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No doctors found matching your search.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorActivity;
