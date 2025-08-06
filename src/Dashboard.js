import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

// Helper to display time as hh:mm:ss
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
  const location = useLocation();
  const user = auth.currentUser;

  const [flashcardsCompleted, setFlashcardsCompleted] = useState(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Fetch all progress when dashboard loads or on navigation
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchAll = async () => {
      try {
        // Flashcards
        const flashRef = doc(db, "users", user.uid, "progress", "flashcards");
        const flashSnap = await getDoc(flashRef);
        setFlashcardsCompleted(
          flashSnap.exists() ? (flashSnap.data().completed || []).length : 0
        );

        // Quizzes
        const quizRef = doc(db, "users", user.uid, "progress", "quizzes");
        const quizSnap = await getDoc(quizRef);
        setQuizzesCompleted(
          quizSnap.exists() ? (quizSnap.data().completed || []).length : 0
        );

        // Time spent
        const totalsRef = doc(db, "users", user.uid, "progress", "totals");
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
    };
    fetchAll();
  }, [user, location]);

  // Handle log out
  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  // Handle reset progress
  const handleReset = async () => {
    if (!user) return;
    if (
      !window.confirm(
        "Are you sure you want to reset ALL your progress? This cannot be undone."
      )
    )
      return;
    setResetting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "progress", "flashcards"));
      await deleteDoc(doc(db, "users", user.uid, "progress", "quizzes"));
      await deleteDoc(doc(db, "users", user.uid, "progress", "totals"));
      setFlashcardsCompleted(0);
      setQuizzesCompleted(0);
      setSecondsSpent(0);
      // Optionally force a re-render
      navigate("/dashboard", { state: { refresh: Date.now() } });
    } catch (err) {
      alert("Failed to reset progress. Please try again.");
    }
    setResetting(false);
  };

  if (!user || loading) return <div style={{ margin: "2rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h2>Welcome to your Dashboard!</h2>
      <p>
        <b>Logged in as:</b> {user.email}
      </p>
      <button onClick={handleLogout} style={{ marginBottom: 16 }}>
        Log out
      </button>
      <hr />
      <h3>Revision Progress</h3>
      <ul>
        <li>Flashcards completed: {flashcardsCompleted}</li>
        <li>Quizzes completed: {quizzesCompleted}</li>
        <li>
          <b>Total Time Spent:</b> {formatTime(secondsSpent)} (hh:mm:ss)
        </li>
      </ul>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => navigate("/flashcards")}>
          Start Revising Flashcards
        </button>
      </div>
      <div>
        <button onClick={() => navigate("/quizzes")}>Start a Quiz</button>
      </div>
      <div style={{ marginTop: 24 }}>
        <button
          onClick={handleReset}
          disabled={resetting}
          style={{
            background: "#f44336",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            opacity: resetting ? 0.6 : 1,
          }}
        >
          {resetting ? "Resetting..." : "Reset All Progress"}
        </button>
      </div>
    </div>
  );
}
