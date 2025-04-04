import React from "react";

const Modal = ({ onClose, children }) => {
  return (
    <div className="fullscreen-popup">
      <div className="popup-content">
        <button className="close-btn" onClick={onClose}>X</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
