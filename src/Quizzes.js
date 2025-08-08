import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./index.css";

// Helper: Shuffle an array (Fisher-Yates)
function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Quizzes() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;

  // --- State ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [section, setSection] = useState(""); // Default: all
  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  // Drag-and-drop/matching state
  const [dragItems, setDragItems] = useState([]);
  const [matchDefs, setMatchDefs] = useState([]);

  // --- Fetch quizzes from Firestore ---
  useEffect(() => {
    if (!username) {
      navigate("/login");
      return;
    }
    setLoading(true);
    getDocs(collection(db, "quizzes"))
      .then((querySnapshot) => {
        const data = [];
        querySnapshot.forEach((doc) =>
          data.push({ id: doc.id, ...doc.data() })
        );
        setQuizQuestions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [navigate, username]);

  // --- Sections ---
  const sections = useMemo(() => {
    const unique = Array.from(
      new Set(quizQuestions.map((q) => q.section || ""))
    );
    return unique.filter(Boolean).sort();
  }, [quizQuestions]);

  // --- Section filtering ---
  const filteredQuestions = useMemo(
    () =>
      section
        ? quizQuestions.filter((q) => String(q.section) === section)
        : quizQuestions,
    [quizQuestions, section]
  );
  const total = filteredQuestions.length;
  const question = filteredQuestions[index] || null;

  // --- Reset on section/filter change ---
  useEffect(() => {
    setIndex(0);
    setFeedback("");
    setUserAnswer("");
    setDragItems([]);
    setMatchDefs([]);
  }, [section, filteredQuestions.length]);

  // --- Progress from Firestore ---
  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const ref = doc(db, "users", username, "progress", "quizzes");
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCompleted(data.completed || []);
        } else setCompleted([]);
      } catch {
        setCompleted([]);
      }
    })();
  }, [username]);

  // --- Drag/matching init on question change ---
  useEffect(() => {
    if (!question) return;
    setUserAnswer("");
    setFeedback("");
    if (question.type === "drag-and-drop" && Array.isArray(question.options)) {
      setDragItems(
        shuffle(question.options.map((text, idx) => ({ id: `${idx}`, text })))
      );
      setMatchDefs([]);
    } else if (question.type === "matching" && Array.isArray(question.pairs)) {
      setMatchDefs(
        shuffle(
          question.pairs.map((pair, idx) => ({
            id: `${idx}`,
            text: pair.right,
          }))
        )
      );
      setDragItems([]);
    } else {
      setDragItems([]);
      setMatchDefs([]);
    }
    // eslint-disable-next-line
  }, [index, question]);

  // --- Drag-and-drop handler ---
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
    if (!question) return;
    let correct = false;
    if (question.type === "multiple-choice") {
      correct = Number(userAnswer) === Number(question.answer);
    } else if (question.type === "fill-in-the-blank") {
      correct =
        userAnswer.trim().toLowerCase() ===
        String(question.answer).trim().toLowerCase();
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
    setFeedback(correct ? "Correct!" : "Incorrect.");
    if (!completed.includes(question.id)) {
      const updated = [...completed, question.id];
      setCompleted(updated);
      const ref = doc(db, "users", username, "progress", "quizzes");
      await setDoc(ref, { completed: updated }, { merge: true });
    }
  };

  const handleNext = () => {
    setFeedback("");
    setUserAnswer("");
    setIndex((i) => (i + 1) % total);
    setDragItems([]);
    setMatchDefs([]);
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
          {/* Progress bar */}
          <div style={{ margin: "32px 0 18px 0", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>
              Question {question ? index + 1 : 0} of {total}
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
          {/* Question */}
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              minHeight: 110,
              minWidth: 380,
              maxWidth: 600,
              marginBottom: 20,
              boxShadow: "0 4px 16px rgba(100,50,50,0.06)",
              fontSize: 21,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {question ? (
              <>
                {/* --- Multiple Choice --- */}
                {question.type === "multiple-choice" && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      Q: {question.question}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {Array.isArray(question.options) &&
                        question.options.map((opt, idx) => (
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
                  </>
                )}
                {/* --- Fill in the blank --- */}
                {question.type === "fill-in-the-blank" && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      Q: {question.question}
                    </div>
                    <input
                      style={{
                        marginTop: 8,
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
                  </>
                )}
                {/* --- Drag and Drop --- */}
                {question.type === "drag-and-drop" && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      Q: {question.question}
                    </div>
                    <div
                      style={{ color: "#444", fontSize: 16, marginBottom: 7 }}
                    >
                      Drag to reorder:
                    </div>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="drag">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 9,
                            }}
                          >
                            {dragItems.map((item, idx) => (
                              <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={idx}
                              >
                                {(providedDraggable) => (
                                  <div
                                    ref={providedDraggable.innerRef}
                                    {...providedDraggable.draggableProps}
                                    {...providedDraggable.dragHandleProps}
                                    style={{
                                      userSelect: "none",
                                      background: "var(--pale-blue)",
                                      borderRadius: 7,
                                      padding: "12px 26px",
                                      fontWeight: 600,
                                      width: 310,
                                      marginBottom: 2,
                                      boxShadow: "0 2px 6px #eee",
                                      textAlign: "center",
                                      ...providedDraggable.draggableProps.style,
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
                  </>
                )}
                {/* --- Matching --- */}
                {question.type === "matching" && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      Q: {question.question}
                    </div>
                    <div
                      style={{ color: "#444", fontSize: 16, marginBottom: 7 }}
                    >
                      Drag the right column to match definitions:
                    </div>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 14,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {/* Left: terms */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {Array.isArray(question.pairs) &&
                            question.pairs.map((pair, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: "#fff",
                                  borderRadius: 8,
                                  border: "1px solid #bacffe",
                                  padding: "16px 30px",
                                  fontWeight: 700,
                                  minWidth: 110,
                                  minHeight: 50,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {pair.left}
                              </div>
                            ))}
                        </div>
                        {/* Right: draggable defs */}
                        <Droppable droppableId="matching">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                              }}
                            >
                              {matchDefs.map((def, idx) => (
                                <Draggable
                                  key={def.id}
                                  draggableId={def.id}
                                  index={idx}
                                >
                                  {(providedDraggable) => (
                                    <div
                                      ref={providedDraggable.innerRef}
                                      {...providedDraggable.draggableProps}
                                      {...providedDraggable.dragHandleProps}
                                      style={{
                                        background: "var(--pale-blue)",
                                        borderRadius: 8,
                                        padding: "14px 22px",
                                        fontWeight: 500,
                                        minWidth: 270,
                                        minHeight: 50,
                                        display: "flex",
                                        alignItems: "center",
                                        boxShadow: "0 2px 6px #eee",
                                        ...providedDraggable.draggableProps
                                          .style,
                                      }}
                                    >
                                      {def.text}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </DragDropContext>
                  </>
                )}
              </>
            ) : (
              <div>No questions in this section.</div>
            )}
            {feedback && (
              <div
                style={{
                  marginTop: 8,
                  color: feedback === "Correct!" ? "green" : "red",
                  fontWeight: 600,
                }}
              >
                {feedback}
              </div>
            )}
          </form>
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
              type="submit"
              onClick={handleSubmit}
              disabled={
                !question ||
                (question.type === "multiple-choice" && userAnswer === "") ||
                (question.type === "fill-in-the-blank" && userAnswer === "") ||
                (question.type === "drag-and-drop" && dragItems.length === 0) ||
                (question.type === "matching" && matchDefs.length === 0)
              }
              style={{ minWidth: 130 }}
            >
              Submit Answer
            </button>
            <button
              className="button-blue"
              type="button"
              onClick={handleNext}
              disabled={total < 2}
              style={{ minWidth: 120 }}
            >
              Next Question
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
