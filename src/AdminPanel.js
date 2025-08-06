import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

// --- Helper to fetch all users and teams ---
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
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    teamId: "",
    role: "student",
  });
  const [teamForm, setTeamForm] = useState({ name: "" });
  const [message, setMessage] = useState("");

  // --- Fetch users and teams on load & when updated ---
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
      // 1. Create in Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      // 2. Set profile (username)
      await updateProfile(cred.user, { displayName: form.username });
      // 3. Add to Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        username: form.username,
        email: form.email,
        teamId: form.teamId || "",
        role: form.role,
      });

      // 4. Assign to team in Firestore
      if (form.teamId) {
        // Reload teams so state is up-to-date
        const teamRef = doc(db, "teams", form.teamId);
        // Fetch the latest team members (avoid using potentially stale state)
        const teamDoc = await getDocs(collection(db, "teams"));
        let selectedTeam = null;
        teamDoc.forEach((t) => {
          if (t.id === form.teamId) selectedTeam = t.data();
        });
        const currentMembers = selectedTeam?.members || [];
        await updateDoc(teamRef, {
          members: [...currentMembers, cred.user.uid],
        });
      }

      setMessage("User created!");
      setForm({
        username: "",
        email: "",
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
      // Remove from all team members arrays
      for (const team of teams) {
        if (team.members && team.members.includes(uid)) {
          await updateDoc(doc(db, "teams", team.id), {
            members: team.members.filter((m) => m !== uid),
          });
        }
      }
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

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto" }}>
      <h2>Admin Panel</h2>
      <button
        style={{
          marginBottom: 16,
          background: "#222",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "0.5em 1.5em",
          fontWeight: "bold",
          cursor: "pointer",
        }}
        onClick={() => navigate("/")}
      >
        Log out
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
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              <th>Email</th>
              <th>Team</th>
              <th>Role</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td>{u.username}</td>
                <td>{u.email}</td>
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
              <th>Members</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <td>{team.name}</td>
                <td>
                  {team.members
                    ?.map(
                      (uid) => users.find((u) => u.uid === uid)?.username || uid
                    )
                    .join(", ")}
                </td>
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
