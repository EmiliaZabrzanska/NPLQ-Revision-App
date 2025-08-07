// src/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import "./index.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // Query Firestore for this username
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      setError("Invalid username or password.");
      return;
    }
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    if (userData.password !== password) {
      setError("Invalid username or password.");
      return;
    }
    if (userData.role === "admin") {
      setError("Please use the Admin Login page.");
      return;
    }
    // Store in localStorage
    localStorage.setItem(
      "user",
      JSON.stringify({ ...userData, uid: userDoc.id })
    );
    navigate("/dashboard");
  };

  return (
    <div className="center-container" style={{ minHeight: "100vh" }}>
      <form
        onSubmit={handleSubmit}
        className="card center-container"
        style={{ width: 380, textAlign: "center" }}
      >
        <h2 style={{ marginBottom: 24, fontWeight: 600 }}>User Login</h2>
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
        {error && (
          <div style={{ color: "red", marginBottom: 8, fontWeight: 500 }}>
            {error}
          </div>
        )}
        <button className="button-red" type="submit" style={{ width: "100%" }}>
          Login
        </button>
        <button
          className="button-blue"
          type="button"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => navigate("/")}
        >
          Back to Front Page
        </button>
      </form>
    </div>
  );
}
