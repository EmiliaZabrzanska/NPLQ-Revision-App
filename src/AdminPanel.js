// src/AdminPanel.js
import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    username: "",
    password: "",
    teamId: "",
    role: "student",
  });
  const [teamForm, setTeamForm] = useState({ name: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const reloadData = async () => {
    setLoading(true);
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersList = [];
    usersSnapshot.forEach((doc) =>
      usersList.push({ uid: doc.id, ...doc.data() })
    );

    const teamsSnapshot = await getDocs(collection(db, "teams"));
    const teamsList = [];
    teamsSnapshot.forEach((doc) =>
      teamsList.push({ id: doc.id, ...doc.data() })
    );

    setUsers(usersList);
    setTeams(teamsList);
    setLoading(false);
  };

  useEffect(() => {
    reloadData();
    // eslint-disable-next-line
  }, []);

  // --- Add User ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    setMessage("Creating user...");
    try {
      const uname = form.username.trim().toLowerCase();
      // Check for duplicate
      const existing = users.find((u) => u.uid === uname);
      if (existing) throw new Error("Username already exists!");
      await setDoc(doc(db, "users", uname), {
        username: uname,
        password: form.password,
        teamId: form.teamId || "",
        role: form.role,
      });
      setMessage("User created!");
      setForm({
        username: "",
        password: "",
        teamId: "",
        role: "student",
      });
      await reloadData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  // --- Delete User ---
  const handleDeleteUser = async (uid) => {
    if (!window.confirm("Are you sure? This will permanently delete the user."))
      return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setMessage("User deleted.");
      await reloadData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  // --- Add Team ---
  const handleAddTeam = async (e) => {
    e.preventDefault();
    setMessage("Creating team...");
    try {
      await addDoc(collection(db, "teams"), {
        name: teamForm.name,
        members: [],
      });
      setTeamForm({ name: "" });
      setMessage("Team created!");
      await reloadData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  // --- Delete Team ---
  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Delete this team? All assignments will be lost."))
      return;
    try {
      await deleteDoc(doc(db, "teams", id));
      setMessage("Team deleted.");
      await reloadData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    navigate("/");
  };

  // --- Style helpers ---
  const contentBoxStyle = {
    maxWidth: 920,
    margin: "40px auto",
    background: "#fff",
    borderRadius: 15,
    boxShadow: "0 4px 16px rgba(110,130,170,0.09)",
    padding: "34px 38px 38px 38px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const tableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    background: "#fff",
    marginTop: 12,
    marginBottom: 28,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 7px rgba(140,140,200,0.03)",
  };

  const tableThTdStyle = {
    textAlign: "center",
    padding: "15px 6px",
    borderBottom: "1px solid #e0e7f5",
    fontSize: 17,
    fontFamily: "inherit",
    background: "var(--pale-blue, #bacffe)",
    fontWeight: 600,
  };

  const tableTdStyle = {
    textAlign: "center",
    padding: "13px 6px",
    fontSize: 17,
    fontFamily: "inherit",
    background: "#fff",
    fontWeight: 400,
  };

  const inputStyle = {
    border: "1px solid #bacffe",
    borderRadius: 8,
    padding: "11px",
    minWidth: 180,
    fontSize: 17,
    background: "#f8fbff",
    marginRight: 10,
  };

  const selectStyle = {
    border: "1px solid #bacffe",
    borderRadius: 8,
    padding: "11px 10px",
    fontSize: 17,
    background: "#f8fbff",
    marginRight: 10,
    minWidth: 120,
  };

  const buttonStyle = {
    background: "var(--pale-red, #ff9e99)",
    color: "#222",
    border: "none",
    borderRadius: 8,
    padding: "11px 32px",
    fontWeight: "bold",
    fontSize: 17,
    cursor: "pointer",
    marginLeft: 8,
    marginRight: 8,
    boxShadow: "0 1px 5px 0 rgba(140,120,120,0.03)",
    transition: "background 0.17s",
  };

  const deleteBtnStyle = {
    ...buttonStyle,
    minWidth: 85,
    padding: "10px 15px",
    marginLeft: 0,
    color: "#222",
    fontWeight: "bold",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(#fff, #bacffe)",
        fontFamily: "'Source Sans Pro', Arial, sans-serif",
      }}
    >
      <div style={contentBoxStyle}>
        <button
          onClick={handleLogout}
          style={{
            position: "absolute",
            top: 32,
            right: 60,
            padding: "9px 20px",
            background: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            fontSize: 15,
            boxShadow: "0 1px 5px 0 rgba(150,100,100,0.08)",
          }}
        >
          Log Out
        </button>
        <h1
          style={{
            fontWeight: 700,
            fontSize: 36,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          Admin Panel
        </h1>
        {loading && <p style={{ margin: "30px 0" }}>Loading...</p>}
        <p style={{ color: "green", marginBottom: 8, minHeight: 25 }}>
          {message}
        </p>

        {/* --- Add New User --- */}
        <section style={{ width: "100%", marginBottom: 30 }}>
          <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>
            Add New User
          </h3>
          <form
            onSubmit={handleAddUser}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 0,
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              marginBottom: 18,
            }}
          >
            <input
              required
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              style={{ ...inputStyle, flex: 1, maxWidth: 180 }}
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ ...inputStyle, flex: 1, maxWidth: 180 }}
            />
            <select
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              style={{ ...selectStyle, flex: 1, maxWidth: 150 }}
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={{ ...selectStyle, flex: 1, maxWidth: 120 }}
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" style={{ ...buttonStyle, minWidth: 135 }}>
              Create User
            </button>
          </form>
        </section>

        {/* --- Users List --- */}
        <section style={{ width: "100%", marginBottom: 38 }}>
          <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>
            Users
          </h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableThTdStyle}>Username</th>
                <th style={tableThTdStyle}>Team</th>
                <th style={tableThTdStyle}>Role</th>
                <th style={tableThTdStyle}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td style={tableTdStyle}>{u.username}</td>
                  <td style={tableTdStyle}>
                    {teams.find((t) => t.id === u.teamId)?.name || ""}
                  </td>
                  <td style={tableTdStyle}>{u.role}</td>
                  <td style={tableTdStyle}>
                    <button
                      onClick={() => handleDeleteUser(u.uid)}
                      style={deleteBtnStyle}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* --- Add Team and Teams List --- */}
        <section style={{ width: "100%" }}>
          <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>
            Add New Team
          </h3>
          <form
            onSubmit={handleAddTeam}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 0,
              width: "100%",
              marginBottom: 18,
              justifyContent: "flex-start",
            }}
          >
            <input
              required
              placeholder="Team Name"
              value={teamForm.name}
              onChange={(e) =>
                setTeamForm({ ...teamForm, name: e.target.value })
              }
              style={{ ...inputStyle, flex: 2, maxWidth: 380 }}
            />
            <button type="submit" style={{ ...buttonStyle, minWidth: 160 }}>
              Create Team
            </button>
          </form>
          <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>
            Teams
          </h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableThTdStyle}>Team Name</th>
                <th style={tableThTdStyle}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td style={tableTdStyle}>{team.name}</td>
                  <td style={tableTdStyle}>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      style={deleteBtnStyle}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
