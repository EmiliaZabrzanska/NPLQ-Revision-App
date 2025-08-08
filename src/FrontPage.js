// src/FrontPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./index.css"; // Import your CSS

export default function FrontPage() {
  const navigate = useNavigate();
  return (
    <div
      className="center-container"
      style={{ height: "100vh", background: "#fff" }}
    >
      {/* ... your main content ... */}
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize: "2.8rem",
            fontWeight: 700,
            color: "#222",
            textAlign: "center",
          }}
        >
          Welcome to your NPLQ Revision App
        </h1>
      </div>
      <div className="center-container">
        <button
          className="button-red"
          style={{ width: 250 }}
          onClick={() => navigate("/login")}
        >
          User Login
        </button>
        <button
          className="button-red"
          style={{ width: 250 }}
          onClick={() => navigate("/adminlogin")}
        >
          Admin Login
        </button>
      </div>
      {/* --- Footer tag --- */}
      <footer
        style={{
          position: "fixed",
          bottom: 10,
          left: 0,
          width: "100%",
          textAlign: "center",
          fontSize: 15,
          color: "#888",
          letterSpacing: 1,
          zIndex: 10,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        Created by Emilia Zabrzanska, August 2025
      </footer>
    </div>
  );
}
