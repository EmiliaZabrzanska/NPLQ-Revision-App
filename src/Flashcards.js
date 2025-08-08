import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./index.css";

export default function Flashcards() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;

  // --- State
  const [flashcards, setFlashcards] = useState([]);
  const [section, setSection] = useState(""); // Default: all
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch all flashcards from Firestore
  useEffect(() => {
    if (!username) {
      navigate("/login");
      return;
    }
    setLoading(true);
    getDocs(collection(db, "flashcards"))
      .then((querySnapshot) => {
        const data = [];
        querySnapshot.forEach((doc) =>
          data.push({ id: doc.id, ...doc.data() })
        );
        setFlashcards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [navigate, username]);

  // --- Section filter & current card
  const sections = useMemo(() => {
    const unique = Array.from(new Set(flashcards.map((f) => f.section || "")));
    return unique.filter(Boolean).sort();
  }, [flashcards]);

  const filteredFlashcards = useMemo(
    () =>
      section
        ? flashcards.filter((f) => String(f.section) === section)
        : flashcards,
    [flashcards, section]
  );
  const card = filteredFlashcards[index] || null;
  const total = filteredFlashcards.length;

  // --- Reset index on section/filter change
  useEffect(() => {
    setIndex(0);
    setShowAnswer(false);
  }, [section, filteredFlashcards.length]);

  // --- Progress
  const handleCompleted = () => {
    if (card)
      setCompleted((prev) =>
        prev.includes(card.id) ? prev : [...prev, card.id]
      );
  };

  // --- Handlers
  const handleNext = () => {
    setShowAnswer(false);
    setIndex((i) => (i + 1) % total);
  };
  const handlePrev = () => {
    setShowAnswer(false);
    setIndex((i) => (i - 1 + total) % total);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--pale-red)" }}>
        <div className="center-container" style={{ height: "100vh" }}>
          <span style={{ fontSize: 22, color: "#999" }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: "'Source Sans Pro', Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex" }}>
        {/* Sidebar: Section selection */}
        <div style={{ minWidth: 170, padding: "32px 12px" }}>
          <div style={{ fontWeight: 600, fontSize: 19, marginBottom: 12 }}>
            Sections
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <button
              className="button-blue"
              style={{
                marginBottom: 4,
                background: section ? "#fff" : "var(--pale-blue)",
              }}
              onClick={() => setSection("")}
            >
              All
            </button>
            {sections.map((s) => (
              <button
                key={s}
                className="button-blue"
                style={{
                  marginBottom: 4,
                  background:
                    section === String(s) ? "var(--pale-blue)" : "#fff",
                }}
                onClick={() => setSection(String(s))}
              >
                Section {s}
              </button>
            ))}
          </div>
        </div>
        {/* Main */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Progress bar and info */}
          <div style={{ margin: "32px 0 18px 0", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>
              Card {card ? index + 1 : 0} of {total}
            </div>
            <div
              style={{
                background: "var(--pale-blue)",
                height: 9,
                borderRadius: 6,
                width: 220,
                margin: "0 auto",
                position: "relative",
              }}
            >
              <div
                style={{
                  background: "#0099ff",
                  width: total ? `${((index + 1) / total) * 100}%` : 0,
                  height: "100%",
                  borderRadius: 6,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ marginTop: 5, fontSize: "0.99em", color: "#555" }}>
              Completed: {completed.length}
            </div>
          </div>
          {/* Card */}
          <div
            style={{
              background: "#fff",
              minWidth: 480,
              minHeight: 140,
              borderRadius: 18,
              padding: 32,
              marginBottom: 20,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 500,
              boxShadow: "0 4px 16px rgba(100,50,50,0.06)",
            }}
          >
            {card ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 24, marginRight: 7 }}>
                  Q:
                </span>
                <span>{card.question}</span>
              </div>
            ) : (
              <div>No flashcards in this section.</div>
            )}
            {showAnswer && card && (
              <div
                style={{
                  marginTop: 18,
                  fontWeight: 600,
                  color: "#222",
                  fontSize: 21,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 20, marginRight: 8 }}>
                  A:
                </span>
                {card.answer}
              </div>
            )}
          </div>
          {/* Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: 18,
              marginBottom: 14,
            }}
          >
            <button
              className="button-blue"
              onClick={handlePrev}
              disabled={total < 2}
              style={{ minWidth: 120 }}
            >
              Previous
            </button>
            <button
              className="button-blue"
              onClick={handleNext}
              disabled={total < 2}
              style={{ minWidth: 120 }}
            >
              Next
            </button>
            <button
              className="button-blue"
              onClick={() => setShowAnswer((v) => !v)}
              disabled={!card}
              style={{ minWidth: 130 }}
            >
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </button>
            <button
              className="button-blue"
              onClick={handleCompleted}
              disabled={!card || completed.includes(card.id)}
              style={{ minWidth: 180 }}
            >
              Mark as Completed
            </button>
          </div>
          {/* Return */}
          <div style={{ marginTop: 32 }}>
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
    </div>
  );
}
