import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./index.css";

// Example flashcard data
const flashcardSections = {
  "Section 1": [
    {
      question: "What does NPLQ stand for?",
      answer: "National Pool Lifeguard Qualification",
    },
    {
      question: "What is the recovery position used for?",
      answer:
        "To maintain an open airway in an unconscious breathing casualty.",
    },
  ],
  "Section 2": [
    {
      question: "How long should you check for breathing?",
      answer: "No more than 10 seconds.",
    },
    {
      question: "What are the signs of a spinal injury?",
      answer: "Pain in neck/back, loss of movement, numbness, or tingling.",
    },
  ],
  "Section 3": [
    {
      question: "What does ABC stand for in first aid?",
      answer: "Airway, Breathing, Circulation",
    },
    {
      question: "What is the first thing you should do at an emergency?",
      answer: "Assess for danger to yourself and others.",
    },
  ],
};

const allSections = Object.keys(flashcardSections);
const CARD_WIDTH = 700;

export default function Flashcards() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;
  const [selectedSections, setSelectedSections] = useState(allSections);
  const [completed, setCompleted] = useState([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Collect all selected flashcards
  const selectedCards = selectedSections
    .map((section) => flashcardSections[section])
    .flat();
  const total = selectedCards.length;
  const card = selectedCards[index];

  // Section change handler
  const handleSectionChange = (e) => {
    const { value, checked } = e.target;
    setShowAnswer(false);
    setIndex(0);
    if (checked) {
      setSelectedSections((prev) =>
        prev.includes(value) ? prev : [...prev, value]
      );
    } else {
      setSelectedSections((prev) => prev.filter((s) => s !== value));
    }
  };

  // Load progress
  useEffect(() => {
    if (!username) {
      navigate("/login");
      return;
    }
    setLoading(true);
    async function fetchProgress() {
      try {
        const ref = doc(db, "users", username, "progress", "flashcards");
        const snap = await getDoc(ref);
        setCompleted(snap.exists() ? snap.data().completed || [] : []);
      } catch {
        setCompleted([]);
      }
      setLoading(false);
    }
    fetchProgress();
    // eslint-disable-next-line
  }, [username, selectedSections]);

  // Save completed flashcards
  const markAsCompleted = async () => {
    if (!card) return;
    const updated = completed.includes(card.id)
      ? completed
      : [...completed, card.id];
    setCompleted(updated);
    const ref = doc(db, "users", username, "progress", "flashcards");
    await setDoc(ref, { completed: updated }, { merge: true });
  };

  // Go to previous card, reset showAnswer
  const goPrevious = () => {
    setIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
    setShowAnswer(false);
  };

  // Go to next card, reset showAnswer
  const goNext = () => {
    setIndex((prev) => (prev + 1) % total);
    setShowAnswer(false);
  };

  if (loading)
    return (
      <div style={{ minHeight: "100vh", background: "var(--pale-red)" }}>
        <div className="center-container" style={{ height: "100vh" }}>
          <span style={{ fontSize: 22, color: "#999" }}>Loading...</span>
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: "'Source Sans Pro', Arial, sans-serif",
        display: "flex",
      }}
    >
      {/* Left sidebar: section selection */}
      <div style={{ minWidth: 170, padding: "32px 12px" }}>
        <div style={{ fontWeight: 600, fontSize: 19, marginBottom: 12 }}>
          Sections
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {allSections.map((section) => (
            <label
              key={section}
              style={{
                marginBottom: 4,
                color: "#333",
                fontSize: 16,
                fontWeight: 500,
                background: "var(--pale-blue)",
                padding: "7px 12px",
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                value={section}
                checked={selectedSections.includes(section)}
                onChange={handleSectionChange}
                style={{
                  accentColor: "var(--pale-blue)",
                  marginRight: 8,
                  verticalAlign: "middle",
                }}
              />
              {section}
            </label>
          ))}
        </div>
      </div>
      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Progress */}
        <div
          style={{
            marginTop: 22,
            marginBottom: 12,
            width: CARD_WIDTH,
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 4 }}>
            Card {index + 1} of {total}
          </div>
          <div
            style={{
              background: "var(--pale-blue)",
              height: 8,
              borderRadius: 6,
              width: 260,
              margin: "6px auto 0 auto",
              position: "relative",
            }}
          >
            <div
              style={{
                background: "#0099ff",
                width: `${((index + 1) / total) * 100}%`,
                height: "100%",
                borderRadius: 6,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ marginTop: 5, fontSize: "1em", color: "#555" }}>
            Completed: {completed.length}
          </div>
        </div>

        {/* Flashcard Box with Q, Question, and Answer (if revealed) */}
        <div
          style={{
            background: "var(--pale-red)",
            border: "1px solid #ccc",
            borderRadius: 20,
            minHeight: 170,
            width: CARD_WIDTH,
            maxWidth: "95vw",
            boxShadow: "0 4px 14px 0 rgba(150,140,255,0.05)",
            margin: "16px 0 28px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 500,
            flexDirection: "column",
          }}
        >
          {/* Q: and question on one line */}
          <span>
            <span style={{ fontWeight: 700, fontSize: 24, marginRight: 12 }}>
              Q:
            </span>
            {card?.question}
          </span>
          {/* Show answer below, but inside the card box */}
          {showAnswer && (
            <div
              style={{
                background: "var(--pale-blue)",
                borderRadius: 8,
                marginTop: 18,
                padding: "14px 22px",
                fontSize: 21,
                fontWeight: 500,
                color: "#222",
                display: "inline-block",
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 8 }}>A:</span>
              {card?.answer}
            </div>
          )}
        </div>

        {/* Buttons Row */}
        <div
          style={{
            width: CARD_WIDTH,
            maxWidth: "95vw",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <button
            className="button-blue"
            style={{ width: 140, fontWeight: 700, fontSize: 17 }}
            onClick={goPrevious}
          >
            Previous
          </button>
          <button
            className="button-blue"
            style={{ width: 140, fontWeight: 700, fontSize: 17 }}
            onClick={goNext}
          >
            Next
          </button>
          <button
            className="button-blue"
            style={{
              width: 190,
              fontWeight: 700,
              fontSize: 17,
              background: showAnswer ? "var(--pale-blue)" : "var(--pale-blue)",
            }}
            onClick={() => setShowAnswer((a) => !a)}
          >
            {showAnswer ? "Hide Answer" : "Show Answer"}
          </button>
          <button
            className="button-blue"
            style={{ width: 190, fontWeight: 700, fontSize: 17 }}
            onClick={markAsCompleted}
            disabled={completed.includes(card?.id)}
          >
            Mark as Completed
          </button>
        </div>

        {/* Return button */}
        <div style={{ marginTop: 38 }}>
          <button
            className="button-red"
            style={{ width: 210 }}
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
