import React, { useState, useEffect } from "react";
import {
  verifyAuth,
  getUserData,
  fetchPatientReports,
  createReport,
  approveReport,
  fetchPatientsForDoctor,
  requestReport,
} from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Report.css";

function Report() {
  const [reports, setReports] = useState([]);
  const [newReport, setNewReport] = useState({
    title: "",
    content: "",
    patientId: "",
    prescriptions: "",
  });
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authData = await verifyAuth();
        if (authData.isAuthenticated) {
          setUserRole(authData.role);
          setUserId(authData.id);

          if (authData.role === "patient") {
            const patientReports = await fetchPatientReports(authData.id);
            setReports(patientReports || []);
          } else if (authData.role === "doctor") {
            const patientsList = await fetchPatientsForDoctor(authData.id);
            setPatients(patientsList || []);
            const doctorReports = await fetchPatientReports();
            setReports(
              doctorReports.filter((r) => r.doctor?.id === authData.id) || []
            );
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value });
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (userRole !== "doctor") return alert("Only doctors can create reports.");

    if (!newReport.title || !newReport.content || !newReport.patientId) {
      alert("All fields are required.");
      return;
    }

    try {
      const createdReport = await createReport(newReport);
      setReports([...reports, createdReport]);
      setNewReport({
        title: "",
        content: "",
        patientId: "",
        prescriptions: "",
      });
    } catch (error) {
      console.error("Error creating report:", error);
      alert("Failed to create report.");
    }
  };

  const handleApproveReport = async (reportId) => {
    if (userRole !== "doctor")
      return alert("Only doctors can approve reports.");
    try {
      const approvedReport = await approveReport(reportId);
      setReports(reports.map((r) => (r.id === reportId ? approvedReport : r)));
    } catch (error) {
      console.error("Error approving report:", error);
      alert("Failed to approve report.");
    }
  };

  const handleRequestReport = async () => {
    if (userRole !== "patient")
      return alert("Only patients can request reports.");
    try {
      const requestedReport = await requestReport();
      setReports([...reports, requestedReport]);
      alert("Report requested successfully!");
    } catch (error) {
      console.error("Error requesting report:", error);
      alert("No new reports are available yet.");
    }
  };

  const downloadPDF = (report) => {
    if (userRole !== "patient") return;
    const doc = new jsPDF();

    // Set Background Color (Full Width)
    doc.setFillColor(22, 160, 133); // Green background
    doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

    // Title Styling
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text(
      "TeleMedical Report with AI Insight",
      doc.internal.pageSize.width / 2,
      15,
      { align: "center" }
    );

    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let yPos = 40;

    // Patient Info
    const rightAlignX = doc.internal.pageSize.width - 80;
    doc.text("Date:", rightAlignX, yPos - 10);
    doc.text(new Date().toLocaleDateString(), rightAlignX + 15, yPos - 10);
    yPos += 9;
    doc.text(
      `Patient: ${report.patient?.first_name || "N/A"} ${
        report.patient?.last_name || "N/A"
      }`,
      13,
      yPos
    );
    yPos += 9;
    doc.text(
      `Date of Birth: ${report.patient?.date_of_birth || "N/A"}`,
      14,
      yPos
    );
    yPos += 19;

    // Report Details Table
    autoTable(doc, {
      startY: yPos,
      head: [["Field", "Details"]],
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
      bodyStyles: { textColor: [44, 62, 80] },
      body: [
        ["Title", report.title?.toUpperCase() || "N/A"],
        [
          "Date",
          new Date(report.created_at || Date.now()).toLocaleDateString(),
        ],
        ["Content", report.content || "N/A"],
        ["Prescription", report.prescription?.medication || "None"],
      ],
    });

    // AI Results Section
    yPos = doc.lastAutoTable.finalY + 19;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AI Analysis Results", 13, yPos);
    yPos += 9;

    // Text AI Result
    const textAI = report.latest_text_ai;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Text-Based Analysis:", 14, yPos);
    yPos += 4;
    if (textAI) {
      const textPrecautions = textAI.precautions?.length
        ? textAI.precautions.join(", ")
        : "N/A";
      autoTable(doc, {
        startY: yPos,
        head: [["Field", "Details"]],
        headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] }, // Blue header
        bodyStyles: { textColor: [44, 62, 80] },
        body: [
          ["Disease", textAI.disease || "N/A"],
          [
            "Probability",
            textAI.probability ? `${textAI.probability}%` : "N/A",
          ],
          ["Symptoms", textAI.symptoms || "N/A"],
          ["Description", textAI.description || "N/A"],
          ["Precautions", textPrecautions],
        ],
      });
      yPos = doc.lastAutoTable.finalY + 9;
    } else {
      doc.text("No text-based AI result available.", 13, yPos);
      yPos += 9;
    }

    // Image AI Result
    const imageAI = report.latest_image_ai;
    doc.text("Image-Based Analysis:", 13, yPos);
    yPos += 4;
    if (imageAI) {
      const imagePrecautions = imageAI.precautions?.length
        ? imageAI.precautions.join(", ")
        : "N/A";
      autoTable(doc, {
        startY: yPos,
        head: [["Field", "Details"]],
        headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255] }, // Red header
        bodyStyles: { textColor: [44, 62, 80] },
        body: [
          ["Disease", imageAI.disease || "N/A"],
          [
            "Probability",
            imageAI.probability ? `${imageAI.probability}%` : "N/A",
          ],
          ["Symptoms", imageAI.symptoms || "N/A"],
          ["Description", imageAI.description || "N/A"],
          ["Precautions", imagePrecautions],
        ],
      });
      yPos = doc.lastAutoTable.finalY + 19;
    } else {
      doc.text("No image-based AI result available.", 13, yPos);
      yPos += 9;
    }

    // Approved By Section
    if (report.status === "APPROVED") {
      const rightAlignX = doc.internal.pageSize.width - 80;
      doc.setFontSize(12);
      doc.text("Approved By:", rightAlignX, yPos);
      doc.setFont("times", "italic");
      doc.setFontSize(13);
      doc.text(
        `Dr. ${report.doctor?.first_name || "N/A"} ${
          report.doctor?.last_name || "N/A"
        }`,
        rightAlignX,
        yPos + 9
      );
      doc.line(rightAlignX, yPos + 9, rightAlignX + 60, yPos + 9);
      doc.setFontSize(11);
      doc.text("On", rightAlignX, yPos + 18);
      doc.text(new Date().toLocaleDateString(), rightAlignX + 10, yPos + 18);
    }

    doc.save(`report_${report.id || "unknown"}.pdf`);
  };

  return (
    <div className="report-container">
      {userRole === "patient" && (
        <div className="patient-container">
          <h2>Your Reports</h2>
          <button onClick={handleRequestReport} className="request">
            Request Report
          </button>
          {reports.length > 0 ? (
            reports.map((report) => (
              <div key={report.id} className="patient-report-card">
                <p>
                  {" "}
                  <b>Date: </b>{" "}
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
                <p>
                  {" "}
                  <b>Title: </b> {report.title}
                </p>
                <p>
                  {" "}
                  <b>Conditions: </b> {report.content}
                </p>
                <p>
                  {" "}
                  <b>Status: </b> {report.status}
                </p>
                <p>
                  <b>Approved By: </b> Dr.{" "}
                  {report.doctor
                    ? `${report.doctor.first_name} ${report.doctor.last_name}`
                    : "N/A"}
                </p>
                {report.status === "APPROVED" && (
                  <button onClick={() => downloadPDF(report)}>
                    Download PDF
                  </button>
                )}
              </div>
            ))
          ) : (
            <p>No reports available.</p>
          )}
        </div>
      )}

      {userRole === "doctor" && (
        <div className="doctor-container">
          <form onSubmit={handleCreateReport} className="report-form">
            <h2>Create Report</h2>
            <div className="form-group">
              <label>Patient</label>
              <select
                name="patientId"
                value={newReport.patientId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={newReport.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Conditions</label>
              <textarea
                name="content"
                value={newReport.content}
                onChange={handleInputChange}
                rows="4"
                required
              />
            </div>
            <div className="form-group">
              <label>Prescriptions</label>
              <textarea
                name="prescriptions"
                value={newReport.prescriptions}
                onChange={handleInputChange}
                rows="2"
              />
            </div>
            <button type="submit" className="submit-btn">
              Create Report
            </button>
          </form>

          <div className="doctor-report-card-container">
            <h2>Your Reports</h2>
            {reports.map((report) => (
              <div key={report.id} className="doctor-report-card">
                <p>
                  {" "}
                  <b>Patient:</b> {report.patient.first_name}{" "}
                  {report.patient.last_name}
                </p>
                <p>
                  {" "}
                  <b>Title:</b> {report.title}
                </p>
                <p>
                  {" "}
                  <b>Status:</b> {report.status}
                </p>
                {report.status === "PENDING" && (
                  <button onClick={() => handleApproveReport(report.id)}>
                    Approve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Report;
