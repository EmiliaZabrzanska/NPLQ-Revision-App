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

  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;

  useEffect(() => {
    if (!username) navigate("/login");
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

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("username");
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
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        boxSizing: "border-box",
        padding: "32px 0 0 0",
        overflowX: "hidden",
      }}
    >
      {/* Top row */}
      <div
        style={{
          maxWidth: 1050,
          margin: "0 auto",
          width: "100%",
          position: "relative",
          minHeight: 80,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 12,
            textAlign: "right",
          }}
        >
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
      {/* Main centered content */}
      <div
        style={{
          maxWidth: 750,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 12px",
        }}
      >
        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 700,
            color: "#222",
            marginTop: 24,
            marginBottom: 0,
            textAlign: "center",
          }}
        >
          Welcome to your Dashboard!
        </h1>
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            margin: "18px 0 18px 0",
            textAlign: "center",
          }}
        >
          Revision Progress
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: 600,
            marginBottom: 32,
          }}
        >
          <div
            className="card"
            style={{
              background: "var(--pale-blue)",
              alignItems: "center",
              flex: "1 1 220px",
              minWidth: 180,
              maxWidth: 260,
              margin: "0 0 16px 0",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Flashcards Completed
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>
              {flashcardsCompleted}
            </div>
            <button
              className="button-red"
              style={{ width: "100%", marginTop: 8, background: "#fff" }}
              onClick={() => navigate("/flashcards")}
            >
              Start Revising Flashcards
            </button>
          </div>
          <div
            className="card"
            style={{
              background: "var(--pale-blue)",
              alignItems: "center",
              flex: "1 1 220px",
              minWidth: 180,
              maxWidth: 260,
              margin: "0 0 16px 0",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Quizzes Completed
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>
              {quizzesCompleted}
            </div>
            <button
              className="button-red"
              style={{ width: "100%", marginTop: 8, background: "#fff" }}
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
