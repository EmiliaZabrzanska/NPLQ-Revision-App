// src/FrontPage.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function FrontPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f8",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2.5rem 2rem",
          borderRadius: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: "1rem" }}>
          Welcome to Your NPLQ Revision App
        </h1>
        <p
          style={{ fontSize: "1.1rem", marginBottom: "2.5rem", color: "#444" }}
        >
          An interactive study companion for NPLQ candidates.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <button
            style={{
              fontSize: "1.15rem",
              padding: "0.7em 2em",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            style={{
              fontSize: "1.15rem",
              padding: "0.7em 2em",
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/admin-login")}
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
