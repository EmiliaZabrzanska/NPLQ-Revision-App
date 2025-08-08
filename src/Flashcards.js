import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import "./index.css";

// Section colours
const SECTION_COLOURS = ["#bacffe", "#bacffe", "#bacffe"];

export default function Flashcards() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;

  // --- FETCH FLASHCARDS FROM FIRESTORE ---
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState(["1", "2", "3"]);
  const [completed, setCompleted] = useState([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (!username) navigate("/login");
  }, [username, navigate]);

  // Fetch flashcards
  useEffect(() => {
    setLoading(true);
    async function fetchFlashcards() {
      try {
        const snapshot = await getDocs(collection(db, "flashcards"));
        const all = [];
        snapshot.forEach((doc) => all.push({ id: doc.id, ...doc.data() }));
        setFlashcards(all);
      } catch (err) {
        setFlashcards([]);
      }
      setLoading(false);
    }
    fetchFlashcards();
  }, []);

  // Fetch completed
  useEffect(() => {
    if (!username) return;
    async function fetchCompleted() {
      const ref = doc(db, "users", username, "progress", "flashcards");
      const snap = await getDoc(ref);
      setCompleted(snap.exists() ? snap.data().completed || [] : []);
    }
    fetchCompleted();
  }, [username]);

  // Section options
  const sectionOptions = useMemo(() => {
    const uniqueSections = Array.from(
      new Set(flashcards.map((f) => String(f.section || "1")))
    );
    return uniqueSections.sort();
  }, [flashcards]);

  // Filtered flashcards
  const filtered = useMemo(
    () =>
      flashcards.filter((f) =>
        selectedSections.includes(String(f.section || "1"))
      ),
    [flashcards, selectedSections]
  );

  // Current card
  const card = filtered[index] || null;

  // --- Handlers ---
  function handleNext() {
    setIndex((i) => (i + 1) % filtered.length);
    setShowAnswer(false);
  }
  function handlePrev() {
    setIndex((i) => (i - 1 + filtered.length) % filtered.length);
    setShowAnswer(false);
  }
  function handleComplete() {
    if (!card) return;
    const updated = completed.includes(card.id)
      ? completed
      : [...completed, card.id];
    setCompleted(updated);
    setDoc(
      doc(db, "users", username, "progress", "flashcards"),
      { completed: updated },
      { merge: true }
    );
    handleNext();
  }

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--pale-red)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 22, color: "#888" }}>Loading...</span>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        width: "100vw",
        overflowX: "hidden",
        fontFamily: "'Source Sans Pro', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "32px 8px 0 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Section selection */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {sectionOptions.map((s, i) => (
            <label
              key={s}
              style={{
                fontWeight: 500,
                fontSize: 16,
                background: SECTION_COLOURS[(Number(s) - 1) % 3],
                padding: "7px 14px",
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={selectedSections.includes(s)}
                onChange={(e) =>
                  setSelectedSections((prev) =>
                    e.target.checked
                      ? [...prev, s]
                      : prev.filter((x) => x !== s)
                  )
                }
                style={{
                  accentColor: "#0099ff",
                  marginRight: 6,
                  verticalAlign: "middle",
                }}
              />
              Section {s}
            </label>
          ))}
        </div>
        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            maxWidth: 350,
            margin: "0 auto 18px auto",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            Card {filtered.length === 0 ? 0 : index + 1} of {filtered.length}
          </div>
          <div
            style={{
              background: "var(--pale-blue)",
              height: 8,
              borderRadius: 6,
              margin: "4px 0",
              width: "100%",
              position: "relative",
            }}
          >
            <div
              style={{
                background: "#0099ff",
                width: `${
                  filtered.length ? ((index + 1) / filtered.length) * 100 : 0
                }%`,
                height: "100%",
                borderRadius: 6,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ marginTop: 3, fontSize: "1em", color: "#555" }}>
            Completed: {completed.length}
          </div>
        </div>
        {/* Flashcard box */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            minHeight: 110,
            width: "100%",
            maxWidth: 470,
            minWidth: 320,
            marginBottom: 20,
            boxShadow:
              "0 8px 32px 0 rgba(150, 140, 255, 0.22), 0 2px 8px 0 rgba(40, 40, 70, 0.09)",
            fontSize: 21,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "28px 18px",
          }}
        >
          {filtered.length === 0 ? (
            <span>No flashcards in selected section(s).</span>
          ) : (
            <>
              <div
                style={{
                  fontWeight: 700,
                  display: "inline-block",
                  marginRight: 8,
                }}
              >
                Q:
              </div>
              <span style={{ display: "inline-block" }}>{card.question}</span>
              {showAnswer && (
                <div
                  style={{
                    marginTop: 15,
                    padding: "10px 0",
                    borderTop: "1px solid #eee",
                    width: "100%",
                    color: "#299967",
                    fontSize: "1.15em",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>A:</span> {card.answer}
                </div>
              )}
            </>
          )}
        </div>
        {/* Buttons row */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginBottom: 16,
            width: "100%",
            maxWidth: 470,
          }}
        >
          <button
            className="button-blue"
            onClick={handlePrev}
            disabled={filtered.length === 0}
            style={{ flex: 1 }}
          >
            Previous
          </button>
          <button
            className="button-blue"
            onClick={handleNext}
            disabled={filtered.length === 0}
            style={{ flex: 1 }}
          >
            Next
          </button>
          <button
            className="button-blue"
            onClick={() => setShowAnswer((s) => !s)}
            disabled={filtered.length === 0}
            style={{ flex: 1 }}
          >
            Show Answer
          </button>
          <button
            className="button-blue"
            onClick={handleComplete}
            disabled={filtered.length === 0}
            style={{ flex: 1 }}
          >
            Mark as Completed
          </button>
        </div>
        {/* Return button */}
        <div style={{ textAlign: "center", width: "100%", maxWidth: 470 }}>
          <button
            className="button-red"
            style={{ width: "100%" }}
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
