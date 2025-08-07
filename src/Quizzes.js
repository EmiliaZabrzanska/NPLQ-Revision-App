import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import "./index.css";

// --- Helper: Shuffle array (Fisher-Yates) ---
function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Quiz data ---
const quizSections = {
  "Section 1": [
    {
      id: "q1",
      type: "multiple-choice",
      question: "What is the primary responsibility of a lifeguard?",
      options: [
        "Rescue swimmers in trouble",
        "Clean the pool",
        "Teach lessons",
        "Sell tickets",
      ],
      answer: 0,
    },
    {
      id: "q2",
      type: "fill-in-the-blank",
      question:
        "The recovery position is used for an unconscious _____ casualty.",
      answer: "breathing",
    },
    {
      id: "dnd1",
      type: "drag-and-drop",
      question: "Arrange the steps of adult CPR in the correct order:",
      options: [
        "Check for response",
        "Open airway",
        "Check breathing",
        "Call emergency services",
        "Start chest compressions",
        "Give rescue breaths",
      ],
      answer: [0, 1, 2, 3, 4, 5],
    },
  ],
  "Section 2": [
    {
      id: "q3",
      type: "multiple-choice",
      question: "How many seconds should you check for breathing?",
      options: ["3", "5", "10", "20"],
      answer: 2,
    },
    {
      id: "q4",
      type: "fill-in-the-blank",
      question: "Signs of a spinal injury include pain in the ____ or back.",
      answer: "neck",
    },
    {
      id: "dnd2",
      type: "drag-and-drop",
      question: "Order the pool rescue sequence from first to last:",
      options: ["Shout and signal", "Reach", "Throw", "Wade", "Swim", "Tow"],
      answer: [0, 1, 2, 3, 4, 5],
    },
    {
      id: "dnd3",
      type: "drag-and-drop",
      question:
        "Drag the casualties into the order in which you should treat them:",
      options: [
        "Unconscious and not breathing",
        "Unconscious and breathing",
        "Bleeding heavily",
        "Minor burns",
      ],
      answer: [0, 1, 2, 3],
    },
  ],
  "Section 3": [
    {
      id: "match1",
      type: "matching",
      question: "Match the NPLQ term to its definition:",
      pairs: [
        { left: "ABC", right: "Airway, Breathing, Circulation" },
        { left: "CPR", right: "Cardiopulmonary Resuscitation" },
        {
          left: "Shock",
          right:
            "A life-threatening condition caused by insufficient blood flow",
        },
      ],
    },
    {
      id: "match2",
      type: "matching",
      question: "Match the emergency signal to its meaning:",
      pairs: [
        { left: "One long whistle", right: "Lifeguard needs assistance" },
        { left: "Three short whistles", right: "Everyone clear the pool" },
        { left: "One short whistle", right: "Attract attention" },
      ],
    },
  ],
};

const allQuizSections = Object.keys(quizSections);

export default function Quizzes() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;

  useEffect(() => {
    if (!username) navigate("/login");
  }, [username, navigate]);

  const [selectedSections, setSelectedSections] = useState(allQuizSections);
  const [completed, setCompleted] = useState([]);
  const [streak, setStreak] = useState(0);

  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dragItems, setDragItems] = useState([]);
  const [matchDefs, setMatchDefs] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Time spent tracker ---
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

  // --- Fetch progress and streak from Firestore ---
  useEffect(() => {
    if (!username) return;
    setLoading(true);
    const fetchQuizProgress = async () => {
      try {
        const ref = doc(db, "users", username, "progress", "quizzes");
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCompleted(data.completed || []);
          setStreak(data.streak || 0);
        } else {
          setCompleted([]);
          setStreak(0);
        }
      } catch (err) {
        setCompleted([]);
        setStreak(0);
      }
      setLoading(false);
    };
    fetchQuizProgress();
    setIndex(0);
    setFeedback("");
    setUserAnswer("");
    setDragItems([]);
    setMatchDefs([]);
    // eslint-disable-next-line
  }, [username, selectedSections]);

  // --- Gather questions ---
  const selectedQuestions = selectedSections
    .map((section) => quizSections[section])
    .flat();
  const total = selectedQuestions.length;
  const current = index + 1;
  const question = selectedQuestions[index];

  // --- Section selector handler ---
  const handleSectionChange = (e) => {
    const { value, checked } = e.target;
    setFeedback("");
    setUserAnswer("");
    setDragItems([]);
    setMatchDefs([]);
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

  // --- Setup for drag and drop/matching ---
  useEffect(() => {
    if (!question) return;
    if (question.type === "drag-and-drop") {
      const shuffled = shuffle(
        question.options.map((text, idx) => ({ id: `${idx}`, text }))
      );
      setDragItems(shuffled);
      setMatchDefs([]);
    } else if (question.type === "matching") {
      const defs = shuffle(
        question.pairs.map((pair, idx) => ({
          id: `${idx}`,
          text: pair.right,
        }))
      );
      setMatchDefs(defs);
      setDragItems([]);
    } else {
      setDragItems([]);
      setMatchDefs([]);
    }
    // eslint-disable-next-line
  }, [index, question]);

  // --- Drag-and-drop handler for order or matching ---
  function handleDragEnd(result) {
    if (!result.destination) return;
    if (question.type === "drag-and-drop") {
      const items = Array.from(dragItems);
      const [reordered] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reordered);
      setDragItems(items);
    } else if (question.type === "matching") {
      const items = Array.from(matchDefs);
      const [reordered] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reordered);
      setMatchDefs(items);
    }
  }

  // --- Submission handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !question) return;
    let correct = false;
    if (question.type === "multiple-choice") {
      correct = parseInt(userAnswer, 10) === question.answer;
    } else if (question.type === "fill-in-the-blank") {
      correct =
        userAnswer.trim().toLowerCase() === question.answer.toLowerCase();
    } else if (question.type === "drag-and-drop") {
      const submittedOrder = dragItems.map((item) =>
        question.options.indexOf(item.text)
      );
      correct =
        JSON.stringify(submittedOrder) === JSON.stringify(question.answer);
    } else if (question.type === "matching") {
      correct = matchDefs.every(
        (def, idx) => def.text === question.pairs[idx].right
      );
    }
    let newStreak = correct ? streak + 1 : 0;
    setFeedback(correct ? "Correct!" : "Incorrect.");
    setStreak(newStreak);

    // Mark as completed (by question id)
    let updated = completed.includes(question.id)
      ? completed
      : [...completed, question.id];
    setCompleted(updated);

    // Save progress to Firestore
    const ref = doc(db, "users", username, "progress", "quizzes");
    await setDoc(
      ref,
      { completed: updated, streak: newStreak },
      { merge: true }
    );
  };

  // --- Next question handler ---
  const handleNext = () => {
    setIndex((prev) => (prev + 1) % total);
    setUserAnswer("");
    setFeedback("");
    setDragItems([]);
    setMatchDefs([]);
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
          {allQuizSections.map((section) => (
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
        {total > 0 && question ? (
          <>
            {/* Progress bar and count for selected questions */}
            <div
              style={{
                fontWeight: 500,
                margin: "0 0 18px 0",
                fontSize: "1.1rem",
                textAlign: "center",
              }}
            >
              Question {current} of {total}
              <div
                style={{
                  background: "var(--pale-blue)",
                  height: 9,
                  borderRadius: 6,
                  margin: "6px auto 0 auto",
                  width: 220,
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
                Completed: {completed.length} | Streak: {streak}
              </div>
            </div>
            {/* Main quiz card */}
            <form
              onSubmit={handleSubmit}
              style={{
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: 16,
                padding: 28,
                minHeight: 120,
                minWidth: 370,
                maxWidth: 540,
                marginBottom: 20,
                boxShadow: "0 4px 14px 0 rgba(150,140,255,0.05)",
                fontSize: 21,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <b>Q:</b> {question.question}
              {/* --- MULTIPLE CHOICE --- */}
              {question.type === "multiple-choice" && (
                <div style={{ marginTop: 14, width: "100%" }}>
                  {question.options.map((opt, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: "block",
                        textAlign: "left",
                        marginBottom: 4,
                        fontWeight: 500,
                        fontSize: 17,
                      }}
                    >
                      <input
                        type="radio"
                        name="mc"
                        value={idx}
                        checked={String(userAnswer) === String(idx)}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        style={{
                          marginRight: 8,
                          accentColor: "var(--pale-blue)",
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {/* --- FILL IN BLANK --- */}
              {question.type === "fill-in-the-blank" && (
                <input
                  style={{
                    marginTop: 18,
                    width: "100%",
                    fontSize: 17,
                    padding: 7,
                    borderRadius: 8,
                    border: "1px solid #bacffe",
                    background: "var(--pale-blue)",
                  }}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer"
                />
              )}
              {/* --- DRAG AND DROP ORDER --- */}
              {question.type === "drag-and-drop" && (
                <div style={{ width: "100%", marginTop: 18 }}>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="dnd-list">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {dragItems.map((item, idx) => (
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={idx}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    background: "var(--pale-blue)",
                                    padding: 13,
                                    borderRadius: 8,
                                    fontSize: 17,
                                    fontWeight: 500,
                                    marginBottom: 2,
                                    boxShadow: snapshot.isDragging
                                      ? "0 2px 8px rgba(80,80,255,0.12)"
                                      : "none",
                                    ...provided.draggableProps.style,
                                  }}
                                >
                                  {item.text}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}
              {/* --- MATCHING QUESTIONS (GRID) --- */}
              {question.type === "matching" && (
                <div style={{ width: "100%", marginTop: 18 }}>
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 16,
                      color: "#444",
                      marginBottom: 8,
                    }}
                  >
                    Drag the right column to match definitions:
                  </div>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="matching" direction="vertical">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "180px 1fr",
                            gap: "12px",
                            marginTop: 8,
                            width: 470,
                            justifyContent: "center",
                          }}
                        >
                          {question.pairs.map((pair, idx) => (
                            <React.Fragment key={pair.left}>
                              {/* Acronym/term cell */}
                              <div
                                style={{
                                  background: "#fff",
                                  borderRadius: 7,
                                  border: "1px solid #eee",
                                  fontWeight: 700,
                                  fontSize: 20,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: 64,
                                  minHeight: 64,
                                  textAlign: "center",
                                }}
                              >
                                {pair.left}
                              </div>
                              {/* Draggable definition cell */}
                              <Draggable
                                draggableId={matchDefs[idx]?.id}
                                index={idx}
                                key={matchDefs[idx]?.id}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      background: "var(--pale-blue)",
                                      borderRadius: 7,
                                      fontSize: 17,
                                      minHeight: 64,
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0 10px",
                                      boxShadow: snapshot.isDragging
                                        ? "0 2px 8px rgba(80,80,255,0.08)"
                                        : "none",
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    {matchDefs[idx]?.text}
                                  </div>
                                )}
                              </Draggable>
                            </React.Fragment>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}
              {feedback && (
                <div
                  style={{
                    marginTop: 18,
                    color: feedback === "Correct!" ? "green" : "red",
                    fontWeight: 600,
                    fontSize: 19,
                  }}
                >
                  {feedback}
                </div>
              )}
            </form>
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
                type="submit"
                onClick={handleSubmit}
                disabled={
                  (!userAnswer &&
                    question.type !== "drag-and-drop" &&
                    question.type !== "matching") ||
                  (question.type === "drag-and-drop" && false) ||
                  (question.type === "matching" && false)
                }
              >
                Submit Answer
              </button>
              <button
                className="button-red"
                type="button"
                onClick={handleNext}
                style={{ minWidth: 120 }}
              >
                Next Question
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
            No quiz questions in selected section(s).
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
