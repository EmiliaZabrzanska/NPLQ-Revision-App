import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AuthForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const adminOnly = new URLSearchParams(location.search).get("admin");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const uname = username.trim().toLowerCase();
      const userRef = doc(db, "users", uname);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError("Invalid username or password.");
        return;
      }
      const user = userSnap.data();
      if (user.password !== password) {
        setError("Invalid username or password.");
        return;
      }
      if (adminOnly && user.role !== "admin") {
        setError("Not an admin account.");
        return;
      }
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("username", uname);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Login failed. Try again.");
    }
  };

  return (
    <div style={{ maxWidth: 340, margin: "4rem auto" }}>
      <h2>{adminOnly ? "Admin Login" : "User Login"}</h2>
      <form onSubmit={handleLogin}>
        <input
          placeholder="Username"
          value={username}
          required
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 8, padding: 8 }}
        />
        <button style={{ width: "100%", padding: 10 }} type="submit">
          Login
        </button>
      </form>
      <div style={{ marginTop: 14 }}>
        <button onClick={() => navigate("/")} style={{ width: "100%" }}>
          Back to Front Page
        </button>
      </div>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
    </div>
  );
}
