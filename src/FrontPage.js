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
    </div>
  );
}
