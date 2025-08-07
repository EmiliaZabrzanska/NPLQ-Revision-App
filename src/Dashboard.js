import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import "./index.css";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    [h, m, s]
      .map((v, i) => (i === 0 && v === 0 ? null : String(v).padStart(2, "0")))
      .filter(Boolean)
      .join(":") || "00:00"
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [flashcardsCompleted, setFlashcardsCompleted] = useState(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // NEW: Read user object and username from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username;

  useEffect(() => {
    if (!username) {
      navigate("/login");
    }
  }, [username, navigate]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    async function fetchAll() {
      try {
        const userRef = doc(db, "users", username);
        const flashRef = doc(userRef, "progress", "flashcards");
        const flashSnap = await getDoc(flashRef);
        setFlashcardsCompleted(
          flashSnap.exists() ? (flashSnap.data().completed || []).length : 0
        );
        const quizRef = doc(userRef, "progress", "quizzes");
        const quizSnap = await getDoc(quizRef);
        setQuizzesCompleted(
          quizSnap.exists() ? (quizSnap.data().completed || []).length : 0
        );
        const totalsRef = doc(userRef, "progress", "totals");
        const totalsSnap = await getDoc(totalsRef);
        setSecondsSpent(
          totalsSnap.exists() ? totalsSnap.data().secondsSpent || 0 : 0
        );
      } catch (err) {
        setFlashcardsCompleted(0);
        setQuizzesCompleted(0);
        setSecondsSpent(0);
      }
      setLoading(false);
    }
    fetchAll();
  }, [username]);

  // NEW: Remove only the user object from localStorage
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleReset = async () => {
    if (!username) return;
    if (
      !window.confirm(
        "Are you sure you want to reset ALL your progress? This cannot be undone."
      )
    )
      return;
    setResetting(true);
    try {
      const userRef = doc(db, "users", username);
      await deleteDoc(doc(userRef, "progress", "flashcards"));
      await deleteDoc(doc(userRef, "progress", "quizzes"));
      await deleteDoc(doc(userRef, "progress", "totals"));
      setFlashcardsCompleted(0);
      setQuizzesCompleted(0);
      setSecondsSpent(0);
      navigate("/dashboard", { state: { refresh: Date.now() } });
    } catch (err) {
      alert("Failed to reset progress. Please try again.");
    }
    setResetting(false);
  };

  if (!username || loading)
    return (
      <div style={{ minHeight: "100vh", background: "#fff" }}>
        <div className="center-container" style={{ height: "100vh" }}>
          <span className="text-lg text-gray-500">Loading...</span>
        </div>
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Top right: user info and log out */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "32px 32px 0 32px",
          position: "relative",
          minHeight: 60,
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, color: "#222", marginBottom: 6 }}>
            <b>Logged in as:</b> {username}
          </div>
          <button
            className="button-red"
            style={{ minWidth: 100 }}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Centered header below */}
      <h2
        style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "#222",
          textAlign: "center",
          margin: "24px 0 0 0",
        }}
      >
        Welcome to your Dashboard!
      </h2>
      {/* Centered main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: "1.3rem",
            fontWeight: 600,
            margin: "24px 0 14px 0",
            textAlign: "center",
          }}
        >
          Revision Progress
        </div>
        <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
          <div
            className="card"
            style={{ background: "var(--pale-blue)", alignItems: "center" }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Flashcards Completed
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>
              {flashcardsCompleted}
            </div>
            <button
              className="button-red"
              style={{ width: 200, marginTop: 8, background: "#fff" }}
              onClick={() => navigate("/flashcards")}
            >
              Start Revising Flashcards
            </button>
          </div>
          <div
            className="card"
            style={{ background: "var(--pale-blue)", alignItems: "center" }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Quizzes Completed
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>
              {quizzesCompleted}
            </div>
            <button
              className="button-red"
              style={{ width: 200, marginTop: 8, background: "#fff" }}
              onClick={() => navigate("/quizzes")}
            >
              Start a Quiz
            </button>
          </div>
        </div>
        {/* Bottom center */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>
            <b>Total Time Spent:</b> {formatTime(secondsSpent)} (hh:mm:ss)
          </div>
          <button
            className="button-red"
            onClick={handleReset}
            disabled={resetting}
            style={{
              minWidth: 160,
              opacity: resetting ? 0.6 : 1,
              background: "var(--pale-red)",
              marginTop: 8,
            }}
          >
            {resetting ? "Resetting..." : "Reset All Progress"}
          </button>
        </div>
      </div>
    </div>
  );
}
