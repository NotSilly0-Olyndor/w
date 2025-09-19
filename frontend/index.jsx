/*
Proprietary Software
Copyright (c) 2025 Ethan Harriott. All Rights Reserved.
Unauthorized copying, modification, or distribution of this file is strictly prohibited.
*/

import { AdBanner, EmpireDashboard, EmbargoList, SanctionPanel, EventFeed } from "./components.jsx";

const { useState, useEffect } = React;
const BASE_URL = "http://localhost:5000";

function App() {
    const [empire, setEmpire] = useState(null);
    const [embargoes, setEmbargoes] = useState([]);
    const [sanctions, setSanctions] = useState([]);
    const [events, setEvents] = useState([]);

    const [targetEmbargo, setTargetEmbargo] = useState("");
    const [targetSanction, setTargetSanction] = useState("");

    const [nameInput, setNameInput] = useState("");
    const [planetInput, setPlanetInput] = useState("");

    // Auth state
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);
    const [authMode, setAuthMode] = useState("login"); // or "register"
    const [authError, setAuthError] = useState("");

    // Fetch events periodically
    useEffect(() => {
        const interval = setInterval(() => {
            fetch(`${BASE_URL}/events`).then(res => res.json()).then(setEvents);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Fetch embargoes & sanctions after empire is created
    useEffect(() => {
        if (!empire) return;
        fetch(`${BASE_URL}/embargoes/${empire.id}`).then(res => res.json()).then(setEmbargoes);
        fetch(`${BASE_URL}/sanctions/1`).then(res => res.json()).then(setSanctions);
    }, [empire]);

    // Fetch empire after login
    useEffect(() => {
        if (!loggedIn || !username) return;
        fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.empireId) {
                fetch(`${BASE_URL}/empire/${data.empireId}`)
                    .then(res => res.json())
                    .then(setEmpire);
            }
        });
    }, [loggedIn, username]);

    // Auth handlers
    const handleAuth = () => {
        setAuthError("");
        if (!username || !password) {
            setAuthError("Username and password required");
            return;
        }
        fetch(`${BASE_URL}/auth/${authMode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) setAuthError(data.error);
            else setLoggedIn(true);
        });
    };

    const logout = () => {
        setLoggedIn(false);
        setUsername("");
        setPassword("");
        setEmpire(null);
    };

    const createEmpire = () => {
        if (!nameInput || !planetInput || !username) return;
        fetch(`${BASE_URL}/empire/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nameInput, planet: planetInput, username })
        }).then(res => res.json()).then(data => setEmpire(data));
    };

    const issueEmbargo = () => {
        if (!targetEmbargo) return;
        fetch(`${BASE_URL}/embargo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ issuerId: empire.id, targetId: parseInt(targetEmbargo), impact: 7 })
        }).then(res => res.json()).then(data => {
            if (!data.error) setEmbargoes([...embargoes, data]);
            setTargetEmbargo("");
        });
    };

    const proposeSanction = () => {
        if (!targetSanction) return;
        fetch(`${BASE_URL}/sanction/propose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allianceId: 1, targetId: parseInt(targetSanction), impact: 5 })
        }).then(res => res.json()).then(data => {
            if (!data.error) setSanctions([...sanctions, data]);
            setTargetSanction("");
        });
    };

    const voteSanction = (id, vote) => {
        fetch(`${BASE_URL}/sanction/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sanctionId: id, vote })
        }).then(res => res.json()).then(updated => {
            setSanctions(sanctions.map(s => s.id === updated.id ? updated : s));
        });
    };

    if (!loggedIn) {
        return (
            <div style={{ maxWidth: "400px", margin: "40px auto", fontFamily: "Arial, sans-serif", border: "1px solid #ccc", padding: 24, borderRadius: 8 }}>
                <h2>{authMode === "login" ? "Login" : "Register"}</h2>
                <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ display: "block", width: "100%", marginBottom: 8 }} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: "block", width: "100%", marginBottom: 8 }} />
                <button onClick={handleAuth} style={{ width: "100%", marginBottom: 8 }}>{authMode === "login" ? "Login" : "Register"}</button>
                <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    style={{ width: "100%", background: "#eee" }}>
                    {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
                </button>
                {authError && <div style={{ color: "red", marginTop: 8 }}>{authError}</div>}
            </div>
        );
    }

    if (!empire) {
        return (
            <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
                <h2>Create Your Empire</h2>
                <input placeholder="Empire Name" value={nameInput} onChange={e => setNameInput(e.target.value)} />
                <input placeholder="Planet Name" value={planetInput} onChange={e => setPlanetInput(e.target.value)} />
                <button onClick={createEmpire}>Create Empire</button>
                <button onClick={logout} style={{ marginLeft: 16 }}>Logout</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
            <div style={{ textAlign: "right", margin: 8 }}>
                <span>Logged in as <b>{username}</b></span>
                <button onClick={logout} style={{ marginLeft: 16 }}>Logout</button>
            </div>
            <AdBanner />
            <EmpireDashboard empire={empire} />
            <EmbargoList embargoes={embargoes} targetEmbargo={targetEmbargo} setTargetEmbargo={setTargetEmbargo} onIssue={issueEmbargo} />
            <SanctionPanel sanctions={sanctions} targetSanction={targetSanction} setTargetSanction={setTargetSanction} onPropose={proposeSanction} onVote={voteSanction} />
            <EventFeed events={events} />
            <AdBanner />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
