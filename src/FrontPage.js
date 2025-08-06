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
        background: "#eaf6ff",
      }}
    >
      <h1>Welcome to your NPLQ Revision App</h1>
      <div style={{ marginTop: 32 }}>
        <button
          onClick={() => navigate("/login")}
          style={{ fontSize: 18, padding: "12px 28px", marginRight: 14 }}
        >
          User Login
        </button>
        <button
          onClick={() => navigate("/login?admin=1")}
          style={{ fontSize: 18, padding: "12px 28px" }}
        >
          Admin Login
        </button>
      </div>
    </div>
  );
}
