import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { fetchPreviousResults, sendAnalysisRequest } from "../api";

function AIModel({ modelType }) {
  const [inputData, setInputData] = useState("");
  const [image, setImage] = useState(null);
  const [predictions, setPredictions] = useState([]); // Array for multiple results
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previousResults, setPreviousResults] = useState([]);
  const [expandedResult, setExpandedResult] = useState(null); // Back to single result for previous
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    const loadPreviousResults = async () => {
      try {
        const results = await fetchPreviousResults();
        setPreviousResults(results || []);
      } catch (error) {
        console.error("Error fetching previous results:", error);
        setPreviousResults([]);
      }
    };
    loadPreviousResults();
  }, []);

  const handleAnalysis = async () => {
    setLoading(true);
    setAnalysisError(null);
    setPredictions([]);
    try {
      const result = await sendAnalysisRequest(inputData, image);
      console.log("Analysis result:", result);
      if (result && result.success) {
        setPredictions(
          Array.isArray(result.data) ? result.data : [result.data]
        );
        setShowModal(true);
      } else if (result) {
        setAnalysisError(
          result.error || "No valid results returned from the image analyzer."
        );
        setPredictions([]);
        setShowModal(true);
      } else {
        setAnalysisError("Unexpected response from server.");
        setShowModal(true);
      }
    } catch (error) {
      console.error("Unexpected error sending analysis request:", error);
      setAnalysisError("An unexpected error occurred. Please try again.");
      setPredictions([]);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const formatProbability = (probability) => {
    return probability > 1 ? probability : (probability * 100).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="ai-container">
        <div className="ai-health">
          <h2 className="text-2xl font-semibold">AI Health Assistant</h2>
          <br />
          <p className="mt-4">
            Describe your symptoms and upload medical images for AI analysis.
          </p>
          <textarea
            className="mt-2 p-2 border border-gray-300 rounded-md w-full"
            placeholder="Enter detailed symptoms..."
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
          ></textarea>
          <input
            className="mt-2"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImage(e.target.files[0]);
              }
            }}
          />
          <button
            className="ai-button mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
            onClick={handleAnalysis}
            disabled={loading}
          >
            {loading ? "Processing..." : "Get AI Analysis"}
          </button>
          <br />
          <br />
          <br />
          <div className="mt-4">
            {/* PLEASE NOTE section */}
            <p className="text-center" style={{ color: "orange" }}>
              <strong>
                <u>PLEASE NOTE</u>
              </strong>
            </p>
            <br />
            <ul className="list-none pl-6 mt-2">
              <li>
                Our model is currently limited to{" "}
                <strong>
                  Malaria, Typhoid, Hepatitis A, Hepatitis E, Tuberculosis,
                  Pneumonia, AIDS, Chicken Pox, and Ringworm
                </strong>
              </li>
              <li>
                For images, it is only limited to <strong>Chicken Pox.</strong>
              </li>
            </ul>
            <br />
            <br />

            {/* WARNING section */}
            <p className="text-center mt-4" style={{ color: "red" }}>
              <strong>
                <u>WARNING</u>
              </strong>
            </p>
            <br />
            <ul className="list-none pl-6 mt-2 text-red-500">
              <li>This model is prone to errors and misdiagnostics.</li>
              <li>
                This is not a substitute for professional medical advice.
                Consult a doctor for accurate and further diagnosis.
              </li>
            </ul>
          </div>
        </div>

        <div className="previous-analyses mt-8">
          <h2 className="text-2xl font-semibold">Previous Analyses</h2>
          <p className="mt-2">View your previous AI reports.</p>
          {previousResults.length === 0 ? (
            <p className="mt-4 text-gray-500">You have no previous analyses.</p>
          ) : (
            previousResults.map((result) => (
              <div
                className="report-item mt-4 p-4 border rounded-md bg-white shadow-md"
                key={result.id}
              >
                <div className="flex justify-between">
                  <strong className="text-lg">
                    {result.disease} (
                    {result.source === "image" ? "Image" : "Text"})
                  </strong>
                  <span className="text-sm text-gray-500">
                    {result.created_at
                      ? new Date(result.created_at).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-semibold">Probability: </span>
                  {formatProbability(result.probability)}%
                </div>
                <button
                  className="mt-2 px-4 py-1 bg-blue-500 text-white rounded-md"
                  onClick={() => {
                    setExpandedResult(result);
                    setShowModal(true);
                  }}
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && !expandedResult && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal-header flex justify-between items-center">
            <h2 className="text-3xl font-bold mb-4">AI Prediction Result</h2>
          </div>
          {analysisError ? (
            <p className="text-red-500 mb-4">{analysisError}</p>
          ) : predictions.length > 0 ? (
            <div className="mb-4">
              {predictions.map((prediction, index) => (
                <div key={index} className="mb-6 border-b pb-4">
                  <h3 className="text-xl font-semibold">
                    {prediction.disease}{" "}
                    {predictions.length > 1 &&
                      (index === 0 ? "(Text Analysis)" : "(Image Analysis)")}
                  </h3>
                  <p>
                    <strong>Probability:</strong>{" "}
                    {formatProbability(prediction.probability)}%
                  </p>
                  <p>
                    <strong>Description:</strong> {prediction.description}
                  </p>
                  <p>
                    <strong>Precautions:</strong>
                  </p>
                  <ul>
                    {(prediction.precautions || []).map((precaution, idx) => (
                      <li key={idx}>- {precaution}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No prediction available.</p>
          )}
          <button
            className="text-xl font-bold text-gray-600"
            onClick={() => setShowModal(false)}
          >
            close
          </button>
        </Modal>
      )}

      {showModal && expandedResult && (
        <Modal
          onClose={() => {
            setShowModal(false);
            setExpandedResult(null);
          }}
        >
          <div className="modal-header flex justify-between items-center">
            <h2 className="text-3xl font-bold mb-4">Previous Analysis</h2>
          </div>
          <div className="text-lg">
            <p>
              <strong>Diagnosis:</strong> {expandedResult.disease}
            </p>
            <p>
              <strong>Source:</strong>{" "}
              {expandedResult.source === "image" ? "Image" : "Text"}
            </p>
            <p>
              <strong>Probability:</strong>{" "}
              {formatProbability(expandedResult.probability)}%
            </p>
            <p>
              <strong>Description:</strong> {expandedResult.description}
            </p>
            <p>
              <strong>Precautions:</strong>
            </p>
            <ul>
              {(expandedResult.precautions || []).map((precaution, index) => (
                <li key={index}>- {precaution}</li>
              ))}
            </ul>
            <p>
              <strong>Timestamp:</strong>{" "}
              {expandedResult.created_at
                ? new Date(expandedResult.created_at).toLocaleString()
                : "N/A"}
            </p>
          </div>
          <button
            className="text-xl font-bold text-gray-600"
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
        </Modal>
      )}
    </div>
  );
}

export default AIModel;
