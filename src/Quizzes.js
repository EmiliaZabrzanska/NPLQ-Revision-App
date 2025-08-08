import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./index.css";

export default function Quizzes() {
  const navigate = useNavigate();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const username = userObj.username;

  // --- FETCH QUIZZES FROM FIRESTORE ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState(["1", "2", "3"]);
  const [completed, setCompleted] = useState([]);
  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dragItems, setDragItems] = useState([]);
  const [matchDefs, setMatchDefs] = useState([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!username) navigate("/login");
  }, [username, navigate]);

  // Fetch quizzes
  useEffect(() => {
    setLoading(true);
    async function fetchQuizzes() {
      try {
        const snapshot = await getDocs(collection(db, "quizzes"));
        const all = [];
        snapshot.forEach((doc) => all.push({ id: doc.id, ...doc.data() }));
        setQuizQuestions(all);
      } catch (err) {
        setQuizQuestions([]);
      }
      setLoading(false);
    }
    fetchQuizzes();
  }, []);

  // Fetch completed
  useEffect(() => {
    if (!username) return;
    async function fetchCompleted() {
      const ref = doc(db, "users", username, "progress", "quizzes");
      const snap = await getDoc(ref);
      setCompleted(snap.exists() ? snap.data().completed || [] : []);
      setStreak(snap.exists() ? snap.data().streak || 0 : 0);
    }
    fetchCompleted();
  }, [username]);

  // Section options
  const sectionOptions = useMemo(() => {
    const uniqueSections = Array.from(
      new Set(quizQuestions.map((f) => String(f.section || "1")))
    );
    return uniqueSections.sort();
  }, [quizQuestions]);

  // Filtered quizzes
  const filtered = useMemo(
    () =>
      quizQuestions.filter((f) =>
        selectedSections.includes(String(f.section || "1"))
      ),
    [quizQuestions, selectedSections]
  );

  // Current question
  const question = filtered[index] || null;

  // --- Handlers ---
  function shuffle(array) {
    let arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Section selection
  function handleSectionChange(s, checked) {
    setFeedback("");
    setUserAnswer("");
    setDragItems([]);
    setMatchDefs([]);
    setIndex(0);
    setSelectedSections((prev) =>
      checked ? [...prev, s] : prev.filter((x) => x !== s)
    );
  }

  // Drag and drop/matching setup
  useEffect(() => {
    if (question && question.type === "drag-and-drop") {
      const shuffled = shuffle(
        question.options.map((text, idx) => ({ id: `${idx}`, text }))
      );
      setDragItems(shuffled);
      setMatchDefs([]);
    } else if (question && question.type === "matching") {
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
  }, [index, question]);

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
        userAnswer.trim().toLowerCase() ===
        String(question.answer || "").toLowerCase();
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
    setIndex((prev) => (prev + 1) % filtered.length);
    setUserAnswer("");
    setFeedback("");
    setDragItems([]);
    setMatchDefs([]);
  };

  // --- Render ---
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
        width: "100vw",
        overflowX: "hidden",
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
                background: "#bacffe",
                padding: "7px 14px",
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={selectedSections.includes(s)}
                onChange={(e) => handleSectionChange(s, e.target.checked)}
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
            Question {filtered.length === 0 ? 0 : index + 1} of{" "}
            {filtered.length}
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
            Completed: {completed.length} | Streak: {streak}
          </div>
        </div>
        {/* Main quiz box */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 28,
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
          }}
        >
          {filtered.length === 0 ? (
            <span>No quiz questions in selected section(s).</span>
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
              <span style={{ display: "inline-block" }}>
                {question.question}
              </span>
              {/* Question input types */}
              <div style={{ marginTop: 16, width: "100%" }}>
                {question.type === "multiple-choice" &&
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
                          accentColor: "#bacffe",
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                {question.type === "fill-in-the-blank" && (
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
                )}
                {question.type === "drag-and-drop" && (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="drag-order">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          {dragItems.map((item, idx) => (
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={idx}
                            >
                              {(prov) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  style={{
                                    background: "#bacffe",
                                    padding: 10,
                                    borderRadius: 8,
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                                    fontWeight: 500,
                                    fontSize: 16,
                                    textAlign: "center",
                                    marginBottom: 0,
                                    ...prov.draggableProps.style,
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
                )}
                {question.type === "matching" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 10,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {question.pairs.map((pair, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#fff",
                            border: "1px solid #bacffe",
                            borderRadius: 8,
                            minHeight: 54,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 18,
                          }}
                        >
                          {pair.left}
                        </div>
                      ))}
                    </div>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="matching">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              flex: 2,
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
                                {(prov) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    style={{
                                      background: "#bacffe",
                                      borderRadius: 8,
                                      minHeight: 54,
                                      padding: "12px 12px",
                                      display: "flex",
                                      alignItems: "center",
                                      fontWeight: 500,
                                      fontSize: 17,
                                      ...prov.draggableProps.style,
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
                    </DragDropContext>
                  </div>
                )}
              </div>
              {feedback && (
                <div
                  style={{
                    marginTop: 12,
                    color: feedback === "Correct!" ? "green" : "red",
                    fontWeight: 600,
                  }}
                >
                  {feedback}
                </div>
              )}
            </>
          )}
        </form>
        {/* Buttons row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 18,
            marginBottom: 14,
            width: "100%",
            maxWidth: 470,
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
            style={{ flex: 1 }}
          >
            Submit Answer
          </button>
          <button
            className="button-blue"
            type="button"
            onClick={handleNext}
            style={{ minWidth: 120, flex: 1 }}
          >
            Next Question
          </button>
        </div>
        {/* Return button */}
        <div style={{ marginTop: 34, width: "100%", maxWidth: 470 }}>
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
