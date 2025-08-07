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

export default function Flashcards() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;
  useEffect(() => {
    if (!username) navigate("/login");
  }, [username, navigate]);

  const [selectedSections, setSelectedSections] = useState(allSections);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timer for total time spent
  useEffect(() => {
    if (!username) return;
    let timer = setInterval(async () => {
      const ref = doc(db, "users", username, "progress", "totals");
      const snapshot = await getDoc(ref);
      const prev = snapshot.exists() ? snapshot.data().secondsSpent || 0 : 0;
      await setDoc(ref, { secondsSpent: prev + 1 }, { merge: true });
    }, 1000);
    return () => clearInterval(timer);
  }, [username]);

  // Helper to make cardId unique per section+index
  const getCardId = (section, cardIndex) => `${section}-${cardIndex}`;

  // Collect all cards currently selected, with section info
  const selectedCards = [];
  selectedSections.forEach((section) => {
    flashcardSections[section].forEach((card, i) => {
      selectedCards.push({ ...card, section, cardIndex: i });
    });
  });

  const total = selectedCards.length;
  const current = index + 1;
  const card = selectedCards[index];
  const cardId = card ? getCardId(card.section, card.cardIndex) : "";

  // Per-section progress calculation
  const sectionProgress = {};
  allSections.forEach((section) => {
    const totalCards = flashcardSections[section].length;
    const completedInSection = flashcardSections[section].filter((c, i) =>
      completed.includes(getCardId(section, i))
    ).length;
    sectionProgress[section] = {
      total: totalCards,
      completed: completedInSection,
    };
  });

  // Load completed from Firestore
  useEffect(() => {
    if (!username) return;
    setLoading(true);
    const fetchProgress = async () => {
      try {
        const ref = doc(db, "users", username, "progress", "flashcards");
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          setCompleted(snapshot.data().completed || []);
        } else {
          setCompleted([]);
        }
      } catch (err) {
        setCompleted([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
    setIndex(0);
    setShowAnswer(false);
    // eslint-disable-next-line
  }, [username, selectedSections]);

  // Section selector handler
  const handleSectionChange = (e) => {
    const { value, checked } = e.target;
    setShowAnswer(false);
    setIndex(0);
    if (checked) {
      setSelectedSections((prev) =>
        prev.includes(value) ? prev : [...prev, value]
      );
    } else {
      setSelectedSections((prev) =>
        prev.filter((section) => section !== value)
      );
    }
  };

  // Mark card as completed and update Firestore
  const markAsCompleted = async () => {
    if (!username || !cardId || completed.includes(cardId)) return;
    const updated = [...completed, cardId];
    setCompleted(updated);
    try {
      const ref = doc(db, "users", username, "progress", "flashcards");
      await setDoc(ref, { completed: updated }, { merge: true });
    } catch (err) {
      // ignore
    }
  };

  const handleNext = () => {
    setShowAnswer(false);
    setIndex((prev) => (prev + 1) % total);
  };
  const handlePrev = () => {
    setShowAnswer(false);
    setIndex((prev) => (prev - 1 + total) % total);
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
        background: "var(--pale-red)",
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
      {/* Top right: progress bars */}
      <div
        style={{
          position: "absolute",
          right: 28,
          top: 30,
          minWidth: 220,
          zIndex: 5,
        }}
      >
        {allSections.map((section) => {
          const p = sectionProgress[section];
          const percent = Math.round((p.completed / p.total) * 100);
          return (
            <div key={section} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.98em", marginBottom: 2 }}>
                {section}: {p.completed} / {p.total}
              </div>
              <div
                style={{
                  background: "var(--pale-blue)",
                  height: 10,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    background: "#6274ce",
                    width: `${percent}%`,
                    height: "100%",
                    borderRadius: 6,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })}
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
        {total > 0 && card ? (
          <>
            {/* Progress bar and count for selected cards */}
            <div
              style={{
                fontWeight: 500,
                margin: "0 0 18px 0",
                fontSize: "1.1rem",
                textAlign: "center",
              }}
            >
              Card {current} of {total}
              <div
                style={{
                  background: "var(--pale-blue)",
                  height: 9,
                  borderRadius: 6,
                  margin: "6px auto 0 auto",
                  width: 200,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    background: "#0099ff",
                    width: `${(current / total) * 100}%`,
                    height: "100%",
                    borderRadius: 6,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div style={{ marginTop: 5, fontSize: "0.98em", color: "#555" }}>
                Completed: {completed.length}
              </div>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: 16,
                padding: 28,
                minHeight: 110,
                minWidth: 330,
                maxWidth: 370,
                marginBottom: 20,
                boxShadow: "0 4px 14px 0 rgba(150,140,255,0.04)",
                fontSize: 21,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span style={{ fontWeight: 700 }}>Q:</span> {card.question}
              {showAnswer && (
                <div style={{ marginTop: 18, fontSize: 20 }}>
                  <span style={{ fontWeight: 600 }}>A:</span> {card.answer}
                </div>
              )}
            </div>
            {/* All buttons in a row */}
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
                disabled={total <= 1}
              >
                Previous
              </button>
              <button
                className="button-blue"
                onClick={handleNext}
                disabled={total <= 1}
              >
                Next
              </button>
              <button
                className="button-red"
                onClick={() => setShowAnswer((s) => !s)}
                style={{ minWidth: 120 }}
              >
                {showAnswer ? "Hide Answer" : "Show Answer"}
              </button>
              <button
                className="button-blue"
                onClick={markAsCompleted}
                disabled={completed.includes(cardId)}
                style={{ minWidth: 120 }}
              >
                {completed.includes(cardId) ? "Completed" : "Mark as Completed"}
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
              color: "#666",
              fontSize: 18,
            }}
          >
            No flashcards in selected section(s).
          </div>
        )}
        {/* Return button */}
        <div style={{ marginTop: 34 }}>
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
