import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// --- Flashcard Data ---
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
  const [selectedSections, setSelectedSections] = useState(allSections);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Track completed cards
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get user
  const user = auth.currentUser;

  // Timer: increment total time spent in Firestore every second
  useEffect(() => {
    if (!user) return;
    let timer = setInterval(async () => {
      const ref = doc(db, "users", user.uid, "progress", "totals");
      const snapshot = await getDoc(ref);
      const prev = snapshot.exists() ? snapshot.data().secondsSpent || 0 : 0;
      await setDoc(ref, { secondsSpent: prev + 1 }, { merge: true });
    }, 1000);
    return () => clearInterval(timer);
  }, [user]);

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
    if (!user) return;
    setLoading(true);
    const fetchProgress = async () => {
      try {
        const ref = doc(db, "users", user.uid, "progress", "flashcards");
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
  }, [user, selectedSections]);

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
    if (!user || !cardId || completed.includes(cardId)) return;
    const updated = [...completed, cardId];
    setCompleted(updated);
    try {
      const ref = doc(db, "users", user.uid, "progress", "flashcards");
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
      <div style={{ textAlign: "center", margin: "2rem" }}>Loading...</div>
    );

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Flashcards</h2>
      {/* --- Per-section progress bars --- */}
      <div>
        {allSections.map((section) => {
          const p = sectionProgress[section];
          const percent = Math.round((p.completed / p.total) * 100);
          return (
            <div key={section} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "0.98em" }}>
                {section}: {p.completed} / {p.total} completed
              </div>
              <div style={{ background: "#eee", height: 8, borderRadius: 6 }}>
                <div
                  style={{
                    background: "#4caf50",
                    width: `${percent}%`,
                    height: "100%",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Section selection --- */}
      <div style={{ margin: "18px 0 12px 0" }}>
        <b>Choose Sections:</b>
        <div style={{ margin: "8px 0" }}>
          {allSections.map((section) => (
            <label key={section} style={{ marginRight: 14 }}>
              <input
                type="checkbox"
                value={section}
                checked={selectedSections.includes(section)}
                onChange={handleSectionChange}
              />
              {section}
            </label>
          ))}
        </div>
      </div>

      {/* --- Flashcard display --- */}
      {total > 0 && card ? (
        <>
          {/* Progress bar and count for selected cards */}
          <div style={{ margin: "12px 0 8px 0" }}>
            <span>
              Card {current} of {total}
            </span>
            <div
              style={{
                background: "#eee",
                height: 8,
                borderRadius: 6,
                overflow: "hidden",
                marginTop: 4,
              }}
            >
              <div
                style={{
                  background: "#0099ff",
                  width: `${(current / total) * 100}%`,
                  height: "100%",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ marginTop: 4, fontSize: "0.95em", color: "#666" }}>
              Completed: {completed.length}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 24,
              minHeight: 120,
              marginBottom: 16,
            }}
          >
            <b>Q:</b> {card.question}
            <br />
            {showAnswer && (
              <>
                <b>A:</b> {card.answer}
              </>
            )}
          </div>
          <button onClick={() => setShowAnswer((s) => !s)}>
            {showAnswer ? "Hide Answer" : "Show Answer"}
          </button>
          <button
            onClick={markAsCompleted}
            disabled={completed.includes(cardId)}
            style={{ marginLeft: 8 }}
          >
            {completed.includes(cardId) ? "Completed" : "Mark as Completed"}
          </button>
          <div style={{ marginTop: 16 }}>
            <button onClick={handlePrev} disabled={total <= 1}>
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={total <= 1}
              style={{ marginLeft: 8 }}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div>No flashcards in selected section(s).</div>
      )}

      <div style={{ marginTop: 32 }}>
        <button
          onClick={() =>
            navigate("/dashboard", { state: { refresh: Date.now() } })
          }
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
