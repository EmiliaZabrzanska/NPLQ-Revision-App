// src/AdminLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// TEMPORARY: Hardcoded admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "nplq2024";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // In a real app, use secure authentication!
      navigate("/admin");
    } else {
      setError("Invalid admin credentials.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f8",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem 2rem",
          borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          minWidth: 340,
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            style={{ width: "100%", marginBottom: 12, padding: 8 }}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={{ width: "100%", marginBottom: 12, padding: 8 }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "0.7em",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            Login as Admin
          </button>
          {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
        </form>
        {/* --- Back to Front Page Button --- */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            style={{
              background: "#eee",
              color: "#222",
              border: "none",
              borderRadius: 6,
              padding: "0.5em 1.5em",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          >
            Back to Front Page
          </button>
        </div>
      </div>
    </div>
  );
}
