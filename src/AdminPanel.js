import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import "./index.css";

const QUIZ_TYPES = [
  { value: "multiple-choice", label: "Multiple Choice" },
  { value: "fill-in-the-blank", label: "Fill in the Blank" },
  { value: "drag-and-drop", label: "Drag & Drop" },
  { value: "matching", label: "Matching" },
];

export default function AdminPanel() {
  // ----- User/Team State -----
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    teamId: "",
    role: "student",
  });
  const [teamForm, setTeamForm] = useState({ name: "" });

  // ----- Resource State -----
  const [resourceTab, setResourceTab] = useState("flashcards");
  const [editingResource, setEditingResource] = useState(null);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  // ----- Misc -----
  const [message, setMessage] = useState("");

  // ----- Fetch Users & Teams -----
  useEffect(() => {
    async function fetchUsersAndTeams() {
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      const teamsSnap = await getDocs(collection(db, "teams"));
      setTeams(teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    fetchUsersAndTeams();
  }, []);

  // ----- Fetch Resources -----
  useEffect(() => {
    setResourcesLoading(true);
    async function fetchResources() {
      const flashSnap = await getDocs(collection(db, "flashcards"));
      setFlashcards(
        flashSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      const quizSnap = await getDocs(collection(db, "quizzes"));
      setQuizzes(
        quizSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setResourcesLoading(false);
    }
    fetchResources();
  }, []);

  // ----- User Actions -----
  const reloadUsersTeams = async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    const teamsSnap = await getDocs(collection(db, "teams"));
    setTeams(teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setMessage("Creating user...");
    try {
      const uname = userForm.username.trim().toLowerCase();
      const existing = users.find((u) => u.uid === uname);
      if (existing) throw new Error("Username already exists!");
      await setDoc(doc(db, "users", uname), {
        username: uname,
        password: userForm.password,
        teamId: userForm.teamId || "",
        role: userForm.role,
      });
      setMessage("User created!");
      setUserForm({
        username: "",
        password: "",
        teamId: "",
        role: "student",
      });
      await reloadUsersTeams();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!window.confirm("Are you sure? This will permanently delete the user."))
      return;
    await deleteDoc(doc(db, "users", uid));
    setMessage("User deleted.");
    await reloadUsersTeams();
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setMessage("Creating team...");
    await addDoc(collection(db, "teams"), {
      name: teamForm.name,
      members: [],
    });
    setTeamForm({ name: "" });
    setMessage("Team created!");
    await reloadUsersTeams();
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Delete this team? All assignments will be lost."))
      return;
    await deleteDoc(doc(db, "teams", id));
    setMessage("Team deleted.");
    await reloadUsersTeams();
  };

  // ----- Resource Actions -----
  async function reloadResources() {
    setResourcesLoading(true);
    const flashSnap = await getDocs(collection(db, "flashcards"));
    setFlashcards(flashSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    const quizSnap = await getDocs(collection(db, "quizzes"));
    setQuizzes(quizSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setResourcesLoading(false);
  }

  // Flashcards
  async function handleAddFlashcard(card) {
    await addDoc(collection(db, "flashcards"), card);
    setMessage("Flashcard added.");
    reloadResources();
  }
  async function handleEditFlashcard(id, card) {
    await updateDoc(doc(db, "flashcards", id), card);
    setMessage("Flashcard updated.");
    reloadResources();
    setEditingResource(null);
  }
  async function handleDeleteFlashcard(id) {
    if (!window.confirm("Delete this flashcard?")) return;
    await deleteDoc(doc(db, "flashcards", id));
    setMessage("Flashcard deleted.");
    reloadResources();
  }

  // Quizzes
  async function handleAddQuiz(q) {
    await addDoc(collection(db, "quizzes"), q);
    setMessage("Quiz question added.");
    reloadResources();
  }
  async function handleEditQuiz(id, q) {
    await updateDoc(doc(db, "quizzes", id), q);
    setMessage("Quiz question updated.");
    reloadResources();
    setEditingResource(null);
  }
  async function handleDeleteQuiz(id) {
    if (!window.confirm("Delete this quiz question?")) return;
    await deleteDoc(doc(db, "quizzes", id));
    setMessage("Quiz question deleted.");
    reloadResources();
  }

  // ----- LOGOUT -----
  function handleLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    window.location.href = "/";
  }

  // --- Tabs: users/teams or resources ---
  const [tab, setTab] = useState("users");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--pale-blue)",
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "30px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 700, margin: 0 }}>
            Admin Panel
          </h1>
          <button
            onClick={handleLogout}
            style={{
              background: "#ff9e99",
              color: "#222",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            Log Out
          </button>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 26, marginBottom: 10, textAlign: "center" }}>
          <button
            className={tab === "users" ? "button-red" : "button-blue"}
            style={{
              marginRight: 14,
              fontWeight: 700,
              fontSize: 18,
              padding: "9px 34px",
            }}
            onClick={() => {
              setTab("users");
              setEditingResource(null);
            }}
          >
            Users & Teams
          </button>
          <button
            className={tab === "resources" ? "button-red" : "button-blue"}
            style={{
              fontWeight: 700,
              fontSize: 18,
              padding: "9px 34px",
            }}
            onClick={() => {
              setTab("resources");
              setEditingResource(null);
            }}
          >
            Resources
          </button>
        </div>

        <div style={{ minHeight: 40, margin: "16px 0", color: "green" }}>
          {message}
        </div>

        {/* ---------- USERS/TEAMS TAB ---------- */}
        {tab === "users" && (
          <div>
            {/* ----- Add New User ----- */}
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "30px 36px 32px 36px",
                margin: "0 auto 30px auto",
                maxWidth: 1000,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Add New User</h2>
              <form
                onSubmit={handleAddUser}
                style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
              >
                <input
                  required
                  placeholder="Username"
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, username: e.target.value }))
                  }
                  style={{ flex: 1, minWidth: 140 }}
                />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, password: e.target.value }))
                  }
                  style={{ flex: 1, minWidth: 120 }}
                />
                <select
                  value={userForm.teamId}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, teamId: e.target.value }))
                  }
                  style={{ flex: 1, minWidth: 140 }}
                >
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, role: e.target.value }))
                  }
                  style={{ flex: 1, minWidth: 120 }}
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="button-red" style={{ minWidth: 180 }}>
                  Create User
                </button>
              </form>
            </div>
            {/* ----- Users Table ----- */}
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "24px 18px",
                margin: "0 auto 30px auto",
                maxWidth: 1000,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Users</h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                }}
              >
                <thead>
                  <tr style={{ background: "var(--pale-blue)" }}>
                    <th>Username</th>
                    <th>Team</th>
                    <th>Role</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td>{u.username}</td>
                      <td>
                        {teams.find((t) => t.id === u.teamId)?.name || ""}
                      </td>
                      <td>{u.role}</td>
                      <td>
                        <button
                          className="button-red"
                          onClick={() => handleDeleteUser(u.uid)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ color: "#999", padding: 18 }}>
                        No users.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* ----- Add Team ----- */}
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "24px 18px",
                margin: "0 auto 30px auto",
                maxWidth: 1000,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Add New Team</h2>
              <form
                onSubmit={handleAddTeam}
                style={{ display: "flex", gap: 18, alignItems: "center" }}
              >
                <input
                  required
                  placeholder="Team Name"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm((f) => ({ ...f, name: e.target.value }))
                  }
                  style={{ flex: 2, minWidth: 220 }}
                />
                <button className="button-red" style={{ minWidth: 160 }}>
                  Create Team
                </button>
              </form>
            </div>
            {/* ----- Teams Table ----- */}
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "24px 18px",
                margin: "0 auto 40px auto",
                maxWidth: 1000,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Teams</h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                }}
              >
                <thead>
                  <tr style={{ background: "var(--pale-blue)" }}>
                    <th>Team Name</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>
                        <button
                          className="button-red"
                          onClick={() => handleDeleteTeam(t.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ color: "#999", padding: 18 }}>
                        No teams.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- RESOURCES TAB ---------- */}
        {tab === "resources" && (
          <ResourceTab
            flashcards={flashcards}
            quizzes={quizzes}
            onAddFlashcard={handleAddFlashcard}
            onEditFlashcard={handleEditFlashcard}
            onDeleteFlashcard={handleDeleteFlashcard}
            onAddQuiz={handleAddQuiz}
            onEditQuiz={handleEditQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            editingResource={editingResource}
            setEditingResource={setEditingResource}
            resourceTab={resourceTab}
            setResourceTab={setResourceTab}
            loading={resourcesLoading}
          />
        )}
      </div>
    </div>
  );
}

// --------- RESOURCES TAB COMPONENT ------------
function ResourceTab({
  flashcards,
  quizzes,
  onAddFlashcard,
  onEditFlashcard,
  onDeleteFlashcard,
  onAddQuiz,
  onEditQuiz,
  onDeleteQuiz,
  editingResource,
  setEditingResource,
  resourceTab,
  setResourceTab,
  loading,
}) {
  // FORM STATE
  const [form, setForm] = useState({
    section: "",
    question: "",
    answer: "",
    options: [""],
    pairs: [{ left: "", right: "" }],
    type: "multiple-choice",
  });

  useEffect(() => {
    if (editingResource) {
      setForm({
        section: editingResource.section || "",
        question: editingResource.question || "",
        answer: editingResource.answer || "",
        options: editingResource.options || [""],
        pairs: editingResource.pairs || [{ left: "", right: "" }],
        type: editingResource.type || "multiple-choice",
      });
    } else {
      setForm({
        section: "",
        question: "",
        answer: "",
        options: [""],
        pairs: [{ left: "", right: "" }],
        type: "multiple-choice",
      });
    }
  }, [editingResource, resourceTab]);

  // FORM CHANGE HANDLERS
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }
  function handleOptionChange(i, value) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, idx) => (idx === i ? value : opt)),
    }));
  }
  function addOption() {
    setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  }
  function removeOption(i) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== i),
    }));
  }
  function handlePairChange(i, field, value) {
    setForm((prev) => ({
      ...prev,
      pairs: prev.pairs.map((p, idx) =>
        idx === i ? { ...p, [field]: value } : p
      ),
    }));
  }
  function addPair() {
    setForm((prev) => ({
      ...prev,
      pairs: [...prev.pairs, { left: "", right: "" }],
    }));
  }
  function removePair(i) {
    setForm((prev) => ({
      ...prev,
      pairs: prev.pairs.filter((_, idx) => idx !== i),
    }));
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (resourceTab === "flashcards") {
      if (editingResource)
        onEditFlashcard(editingResource.id, {
          section: form.section,
          question: form.question,
          answer: form.answer,
        });
      else onAddFlashcard(form);
    } else {
      // Quizzes
      const base = {
        section: form.section,
        question: form.question,
        type: form.type,
      };
      if (form.type === "multiple-choice") base.options = form.options;
      if (form.type === "multiple-choice" || form.type === "fill-in-the-blank")
        base.answer = form.answer;
      if (form.type === "drag-and-drop") {
        base.options = form.options;
        base.answer = form.answer
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((x) => !isNaN(x));
      }
      if (form.type === "matching") {
        base.pairs = form.pairs;
      }
      if (editingResource) onEditQuiz(editingResource.id, base);
      else onAddQuiz(base);
    }
    setForm({
      section: "",
      question: "",
      answer: "",
      options: [""],
      pairs: [{ left: "", right: "" }],
      type: "multiple-choice",
    });
    setEditingResource(null);
  }
  // ----------

  // UI
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 24,
          marginTop: 6,
        }}
      >
        <button
          className={
            resourceTab === "flashcards" ? "button-red" : "button-blue"
          }
          style={{ minWidth: 170, fontWeight: 700 }}
          onClick={() => {
            setResourceTab("flashcards");
            setEditingResource(null);
          }}
        >
          Flashcards
        </button>
        <button
          className={resourceTab === "quizzes" ? "button-red" : "button-blue"}
          style={{ minWidth: 170, fontWeight: 700 }}
          onClick={() => {
            setResourceTab("quizzes");
            setEditingResource(null);
          }}
        >
          Quizzes
        </button>
      </div>

      {/* ---- Resource Form ---- */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          borderRadius: 13,
          padding: 26,
          maxWidth: 740,
          margin: "0 auto 32px auto",
        }}
      >
        <div style={{ display: "flex", gap: 18 }}>
          <input
            name="section"
            placeholder="Section (e.g. 1, 2, 3)"
            value={form.section}
            onChange={handleChange}
            style={{ width: 140 }}
            required
          />
          <input
            name="question"
            placeholder="Question"
            value={form.question}
            onChange={handleChange}
            style={{ flex: 1 }}
            required
          />
        </div>
        {/* Flashcard answer */}
        {resourceTab === "flashcards" && (
          <input
            name="answer"
            placeholder="Answer"
            value={form.answer}
            onChange={handleChange}
            style={{ width: "100%", marginTop: 12 }}
            required
          />
        )}
        {/* Quiz fields */}
        {resourceTab === "quizzes" && (
          <div style={{ marginTop: 12 }}>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              style={{ marginBottom: 8 }}
            >
              {QUIZ_TYPES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
            {/* MCQ Options */}
            {(form.type === "multiple-choice" ||
              form.type === "drag-and-drop") &&
              form.options.map((opt, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", gap: 8, marginTop: 6 }}
                >
                  <input
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    style={{ flex: 1 }}
                    required
                  />
                  <button
                    type="button"
                    style={{
                      background: "#eee",
                      color: "#222",
                      border: "none",
                      borderRadius: 6,
                      padding: "0.5em 1em",
                    }}
                    onClick={() => removeOption(idx)}
                    disabled={form.options.length <= 2}
                  >
                    &minus;
                  </button>
                  {idx === form.options.length - 1 && (
                    <button
                      type="button"
                      style={{
                        background: "#eee",
                        color: "#222",
                        border: "none",
                        borderRadius: 6,
                        padding: "0.5em 1em",
                      }}
                      onClick={addOption}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            {/* MCQ Answer */}
            {form.type === "multiple-choice" && (
              <input
                name="answer"
                placeholder="Correct Option Number (e.g. 1)"
                value={form.answer}
                onChange={handleChange}
                style={{ marginTop: 10, width: 250 }}
                required
              />
            )}
            {/* Fill in the blank */}
            {form.type === "fill-in-the-blank" && (
              <input
                name="answer"
                placeholder="Correct Answer"
                value={form.answer}
                onChange={handleChange}
                style={{ marginTop: 10, width: 250 }}
                required
              />
            )}
            {/* Drag and drop answer */}
            {form.type === "drag-and-drop" && (
              <input
                name="answer"
                placeholder="Order e.g. 0,1,2,3"
                value={form.answer}
                onChange={handleChange}
                style={{ marginTop: 10, width: 250 }}
                required
              />
            )}
            {/* Matching */}
            {form.type === "matching" &&
              form.pairs.map((pair, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", gap: 8, marginTop: 6 }}
                >
                  <input
                    value={pair.left}
                    onChange={(e) =>
                      handlePairChange(idx, "left", e.target.value)
                    }
                    placeholder="Term"
                    style={{ flex: 1 }}
                    required
                  />
                  <input
                    value={pair.right}
                    onChange={(e) =>
                      handlePairChange(idx, "right", e.target.value)
                    }
                    placeholder="Definition"
                    style={{ flex: 2 }}
                    required
                  />
                  <button
                    type="button"
                    style={{
                      background: "#eee",
                      color: "#222",
                      border: "none",
                      borderRadius: 6,
                      padding: "0.5em 1em",
                    }}
                    onClick={() => removePair(idx)}
                    disabled={form.pairs.length <= 2}
                  >
                    &minus;
                  </button>
                  {idx === form.pairs.length - 1 && (
                    <button
                      type="button"
                      style={{
                        background: "#eee",
                        color: "#222",
                        border: "none",
                        borderRadius: 6,
                        padding: "0.5em 1em",
                      }}
                      onClick={addPair}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <button
            className="button-red"
            type="submit"
            style={{ minWidth: 190 }}
          >
            {editingResource ? "Save Changes" : "Add"}
          </button>
          {editingResource && (
            <button
              type="button"
              className="button-blue"
              style={{ minWidth: 130, marginLeft: 14 }}
              onClick={() => setEditingResource(null)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ---- Resource Table ---- */}
      <div
        style={{
          background: "#fff",
          borderRadius: 13,
          padding: 20,
          margin: "0 auto",
          maxWidth: 900,
        }}
      >
        {loading ? (
          <div style={{ color: "#555" }}>Loading...</div>
        ) : (
          <>
            {resourceTab === "flashcards" ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                }}
              >
                <thead>
                  <tr style={{ background: "var(--pale-blue)" }}>
                    <th>Section</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {flashcards.map((f) => (
                    <tr key={f.id}>
                      <td>{f.section}</td>
                      <td>{f.question}</td>
                      <td>{f.answer}</td>
                      <td>
                        <button
                          className="button-blue"
                          onClick={() =>
                            setEditingResource({ ...f, type: "flashcard" })
                          }
                        >
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className="button-red"
                          onClick={() => onDeleteFlashcard(f.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {flashcards.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "#999", padding: 18 }}>
                        No flashcards.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                }}
              >
                <thead>
                  <tr style={{ background: "var(--pale-blue)" }}>
                    <th>Section</th>
                    <th>Type</th>
                    <th>Question</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q) => (
                    <tr key={q.id}>
                      <td>{q.section}</td>
                      <td>{q.type}</td>
                      <td style={{ maxWidth: 300, whiteSpace: "normal" }}>
                        {q.question}
                      </td>
                      <td>
                        <button
                          className="button-blue"
                          onClick={() => setEditingResource(q)}
                        >
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className="button-red"
                          onClick={() => onDeleteQuiz(q.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quizzes.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "#999", padding: 18 }}>
                        No quiz questions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
