import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
  const user = auth.currentUser;

  const [selectedSections, setSelectedSections] = useState(allQuizSections);
  const [completed, setCompleted] = useState([]);
  const [streak, setStreak] = useState(0);

  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dragItems, setDragItems] = useState([]);
  const [matchDefs, setMatchDefs] = useState([]);

  // --- Time spent tracker ---
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

  // --- Fetch progress and streak from Firestore ---
  useEffect(() => {
    if (!user) return;
    const fetchQuizProgress = async () => {
      try {
        const ref = doc(db, "users", user.uid, "progress", "quizzes");
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
    };
    fetchQuizProgress();
    setIndex(0);
    setFeedback("");
    setUserAnswer("");
    setDragItems([]);
    setMatchDefs([]);
    // eslint-disable-next-line
  }, [user, selectedSections]);

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
    if (!user || !question) return;
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
    const ref = doc(db, "users", user.uid, "progress", "quizzes");
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

  return (
    <div style={{ maxWidth: 540, margin: "2rem auto" }}>
      <h2>Quizzes</h2>
      <div style={{ marginBottom: 12 }}>
        <b>Choose Sections:</b>
        <div style={{ margin: "8px 0" }}>
          {allQuizSections.map((section) => (
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

      {total > 0 && question ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <span>
              Question {current} of {total}
            </span>
            <div style={{ marginTop: 4, fontSize: "0.95em", color: "#666" }}>
              Completed: {completed.length} | Streak: {streak}
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 24,
                minHeight: 80,
                marginBottom: 16,
              }}
            >
              <b>Q:</b> {question.question}
              <br />
              {question.type === "multiple-choice" && (
                <div style={{ marginTop: 8 }}>
                  {question.options.map((opt, idx) => (
                    <label key={idx} style={{ display: "block" }}>
                      <input
                        type="radio"
                        name="mc"
                        value={idx}
                        checked={String(userAnswer) === String(idx)}
                        onChange={(e) => setUserAnswer(e.target.value)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {question.type === "fill-in-the-blank" && (
                <input
                  style={{ marginTop: 8, width: "100%" }}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer"
                />
              )}
              {question.type === "drag-and-drop" && dragItems.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <small>Drag to reorder:</small>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="droppable">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
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
                                    background: snapshot.isDragging
                                      ? "#d3e7fd"
                                      : "#f0f0f0",
                                    marginBottom: 8,
                                    padding: 10,
                                    borderRadius: 5,
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
              {question.type === "matching" && matchDefs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <small>Drag each definition to match the correct term:</small>
                  <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                    <div>
                      <b>Term</b>
                      <ul style={{ listStyle: "none", padding: 0 }}>
                        {question.pairs.map((pair, idx) => (
                          <li
                            key={idx}
                            style={{
                              padding: "8px 0",
                              borderBottom: "1px solid #eee",
                              minHeight: 40,
                            }}
                          >
                            {pair.left}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <b>Definition</b>
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="defs">
                          {(provided) => (
                            <ul
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              style={{ listStyle: "none", padding: 0 }}
                            >
                              {matchDefs.map((def, idx) => (
                                <Draggable
                                  key={def.id}
                                  draggableId={def.id}
                                  index={idx}
                                >
                                  {(provided, snapshot) => (
                                    <li
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{
                                        marginBottom: 8,
                                        background: snapshot.isDragging
                                          ? "#d3e7fd"
                                          : "#f0f0f0",
                                        padding: 10,
                                        borderRadius: 5,
                                        minHeight: 40,
                                        ...provided.draggableProps.style,
                                      }}
                                    >
                                      {def.text}
                                    </li>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </ul>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={
                (!userAnswer &&
                  question.type !== "drag-and-drop" &&
                  question.type !== "matching") ||
                (question.type === "drag-and-drop" && dragItems.length === 0) ||
                (question.type === "matching" && matchDefs.length === 0)
              }
            >
              Submit Answer
            </button>
          </form>
          {feedback && (
            <div
              style={{
                marginTop: 8,
                color: feedback === "Correct!" ? "green" : "red",
              }}
            >
              {feedback}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleNext}>Next Question</button>
          </div>
        </>
      ) : (
        <div>No quiz questions in selected section(s).</div>
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
