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

const fetchUsersAndTeams = async () => {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const users = [];
  usersSnapshot.forEach((doc) => users.push({ uid: doc.id, ...doc.data() }));

  const teamsSnapshot = await getDocs(collection(db, "teams"));
  const teams = [];
  teamsSnapshot.forEach((doc) => teams.push({ id: doc.id, ...doc.data() }));

  return { users, teams };
};

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
    const { users, teams } = await fetchUsersAndTeams();
    setUsers(users);
    setTeams(teams);
    setLoading(false);
  };

  useEffect(() => {
    reloadData();
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

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto" }}>
      <h2>Admin Panel</h2>
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          padding: "7px 18px",
          background: "#f44336",
          color: "#fff",
          border: "none",
          borderRadius: 5,
          fontWeight: "bold",
        }}
      >
        Log Out
      </button>
      {loading && <p>Loading...</p>}
      <p style={{ color: "green" }}>{message}</p>

      {/* --- Add New User --- */}
      <section
        style={{
          borderBottom: "1px solid #ddd",
          paddingBottom: 20,
          marginBottom: 20,
        }}
      >
        <h3>Add New User</h3>
        <form
          onSubmit={handleAddUser}
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          <input
            required
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            value={form.teamId}
            onChange={(e) => setForm({ ...form, teamId: e.target.value })}
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
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit">Create User</button>
        </form>
      </section>

      {/* --- Users List --- */}
      <section
        style={{
          borderBottom: "1px solid #ddd",
          paddingBottom: 20,
          marginBottom: 20,
        }}
      >
        <h3>Users</h3>
        <table border="1" cellPadding={8}>
          <thead>
            <tr>
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
                <td>{teams.find((t) => t.id === u.teamId)?.name || ""}</td>
                <td>{u.role}</td>
                <td>
                  <button
                    onClick={() => handleDeleteUser(u.uid)}
                    style={{ color: "red" }}
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
      <section>
        <h3>Add New Team</h3>
        <form onSubmit={handleAddTeam} style={{ display: "flex", gap: 12 }}>
          <input
            required
            placeholder="Team Name"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
          />
          <button type="submit">Create Team</button>
        </form>
        <h3>Teams</h3>
        <table border="1" cellPadding={8}>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <td>{team.name}</td>
                <td>
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    style={{ color: "red" }}
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
  );
}
