/*
Proprietary Software
Copyright (c) 2025 Ethan Harriott. All Rights Reserved.
Unauthorized copying, modification, or distribution of this file is strictly prohibited.
*/

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Persistent data ---
const fs = require("fs");
const DATA_PATH = __dirname + "/data.json";
function loadData() {
    try {
        const raw = fs.readFileSync(DATA_PATH, "utf8");
        const data = JSON.parse(raw);
        if (!data.users) data.users = {};
        return data;
    } catch (e) {
        return { users: {}, empires: {}, embargoes: [], sanctions: [], events: [] };
    }
}
function saveData() {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ users, empires, embargoes, sanctions, events }, null, 2));
}
let { users, empires, embargoes, sanctions, events, issues, policies, regions } = loadData();
if (!issues) issues = [];
if (!policies) policies = [];
if (!regions) regions = [];
// Add RMB and admin fields to regions if missing
for (const region of regions) {
    if (!region.rmb) region.rmb = [];
    if (!region.admins) region.admins = [region.founder];
}
// --- Region Admin Controls ---
// Add admin to region (founder only)
app.post("/region/add-admin", (req, res) => {
    const { regionId, founder, username } = req.body;
    const region = regions.find(r => r.id === regionId);
    if (!region || region.founder !== founder) return res.status(403).json({ error: "Only founder can add admins" });
    if (!region.admins.includes(username)) region.admins.push(username);
    saveData();
    res.json({ success: true, admins: region.admins });
});
// Remove admin from region (founder only)
app.post("/region/remove-admin", (req, res) => {
    const { regionId, founder, username } = req.body;
    const region = regions.find(r => r.id === regionId);
    if (!region || region.founder !== founder) return res.status(403).json({ error: "Only founder can remove admins" });
    region.admins = region.admins.filter(u => u !== username);
    saveData();
    res.json({ success: true, admins: region.admins });
});
// --- Regional Message Board (RMB) ---
// Post RMB message
app.post("/region/rmb/post", (req, res) => {
    const { regionId, username, message } = req.body;
    const region = regions.find(r => r.id === regionId);
    if (!region || !username || !message) return res.status(400).json({ error: "Invalid input" });
    region.rmb.push({ id: Date.now(), username, message });
    if (region.rmb.length > 100) region.rmb.shift(); // keep last 100
    saveData();
    res.json({ success: true, rmb: region.rmb });
});
// Get RMB messages
app.get("/region/:id/rmb", (req, res) => {
    const region = regions.find(r => r.id === parseInt(req.params.id));
    if (!region) return res.status(404).json({ error: "Region not found" });
    res.json(region.rmb || []);
});
// Delete RMB message (admin only)
app.post("/region/rmb/delete", (req, res) => {
    const { regionId, username, messageId } = req.body;
    const region = regions.find(r => r.id === regionId);
    if (!region || !region.admins.includes(username)) return res.status(403).json({ error: "Admin only" });
    region.rmb = (region.rmb || []).filter(m => m.id !== messageId);
    saveData();
    res.json({ success: true, rmb: region.rmb });
});
// --- Region System ---
// Create a region
app.post("/region/create", (req, res) => {
    const { name, founder } = req.body;
    if (!name || !founder) return res.status(400).json({ error: "Name and founder required" });
    if (regions.find(r => r.name === name)) return res.status(400).json({ error: "Region already exists" });
    const newRegion = { id: Date.now(), name, founder, empires: [] };
    regions.push(newRegion);
    saveData();
    res.json(newRegion);
});
// List all regions
app.get("/regions", (req, res) => {
    res.json(regions);
});
// Join a region
app.post("/region/join", (req, res) => {
    const { empireId, regionId } = req.body;
    const region = regions.find(r => r.id === regionId);
    const empire = empires[empireId];
    if (!region || !empire) return res.status(400).json({ error: "Invalid region or empire" });
    // Remove from previous region
    regions.forEach(r => {
        r.empires = r.empires.filter(eid => eid !== empireId);
    });
    region.empires.push(empireId);
    empire.regionId = regionId;
    saveData();
    res.json({ success: true, region });
});
// Leave a region
app.post("/region/leave", (req, res) => {
    const { empireId } = req.body;
    const empire = empires[empireId];
    if (!empire || !empire.regionId) return res.status(400).json({ error: "Empire not in a region" });
    const region = regions.find(r => r.id === empire.regionId);
    if (region) region.empires = region.empires.filter(eid => eid !== empireId);
    delete empire.regionId;
    saveData();
    res.json({ success: true });
});
// Get region info
app.get("/region/:id", (req, res) => {
    const region = regions.find(r => r.id === parseInt(req.params.id));
    if (!region) return res.status(404).json({ error: "Region not found" });
    // Attach empire details
    const emps = (region.empires || []).map(eid => empires[eid]).filter(Boolean);
    res.json({ ...region, empires: emps });
});
// --- Anti-godmoding stat caps ---
const STAT_CAPS = {
    population: 100000000,
    economy: 1000000,
    military: 10000,
    technology: 1000,
    influence: 1000,
    stability: 100
};
function enforceCaps(empire) {
    for (const stat in STAT_CAPS) {
        if (empire[stat] > STAT_CAPS[stat]) empire[stat] = STAT_CAPS[stat];
        if (empire[stat] < 0) empire[stat] = 0;
    }
}
// --- Issue System ---
// Suggest an issue
app.post("/issue/suggest", (req, res) => {
    const { username, title, description, options } = req.body;
    if (!username || !title || !description || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "Invalid issue format" });
    }
    issues.push({ id: Date.now(), username, title, description, options });
    saveData();
    res.json({ success: true });
});
// Get all issues
app.get("/issues", (req, res) => {
    res.json(issues);
});
// Assign a random issue to an empire
app.post("/empire/assign-issue", (req, res) => {
    const { empireId } = req.body;
    if (!empires[empireId]) return res.status(400).json({ error: "Invalid empire" });
    if (!issues.length) return res.status(400).json({ error: "No issues available" });
    const issue = issues[Math.floor(Math.random() * issues.length)];
    if (!empires[empireId].activeIssues) empires[empireId].activeIssues = [];
    empires[empireId].activeIssues.push({ ...issue, chosen: null });
    saveData();
    res.json(issue);
});
// Get active issues for an empire
app.get("/empire/:id/issues", (req, res) => {
    const id = parseInt(req.params.id);
    if (!empires[id]) return res.status(404).json({ error: "Empire not found" });
    res.json(empires[id].activeIssues || []);
});
// Choose an option for an issue
app.post("/empire/resolve-issue", (req, res) => {
    const { empireId, issueId, optionIdx } = req.body;
    const emp = empires[empireId];
    if (!emp || !emp.activeIssues) return res.status(400).json({ error: "No active issues" });
    const issue = emp.activeIssues.find(i => i.id === issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    if (issue.chosen !== null) return res.status(400).json({ error: "Already resolved" });
    issue.chosen = optionIdx;
    // Example: apply random stat effect
    const stat = Object.keys(STAT_CAPS)[optionIdx % Object.keys(STAT_CAPS).length];
    emp[stat] += 10 * (optionIdx + 1);
    enforceCaps(emp);
    saveData();
    res.json({ success: true, stat, value: emp[stat] });
});

// --- Policy System ---
// Suggest a policy
app.post("/policy/suggest", (req, res) => {
    const { username, title, description, effect } = req.body;
    if (!username || !title || !description || typeof effect !== "object") {
        return res.status(400).json({ error: "Invalid policy format" });
    }
    policies.push({ id: Date.now(), username, title, description, effect, votes: 0 });
    saveData();
    res.json({ success: true });
});
// Get all policies
app.get("/policies", (req, res) => {
    res.json(policies);
});
// Vote for a policy
app.post("/policy/vote", (req, res) => {
    const { policyId } = req.body;
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return res.status(404).json({ error: "Policy not found" });
    policy.votes++;
    saveData();
    res.json({ success: true, votes: policy.votes });
});
// Adopt a policy for an empire
app.post("/empire/adopt-policy", (req, res) => {
    const { empireId, policyId } = req.body;
    const emp = empires[empireId];
    const policy = policies.find(p => p.id === policyId);
    if (!emp || !policy) return res.status(400).json({ error: "Invalid empire or policy" });
    if (!emp.policies) emp.policies = [];
    emp.policies.push(policyId);
    // Apply effect
    for (const stat in policy.effect) {
        if (emp[stat] !== undefined) emp[stat] += policy.effect[stat];
    }
    enforceCaps(emp);
    saveData();
    res.json({ success: true, policies: emp.policies });
});

// --- Moderation: Remove issue or policy ---
app.post("/moderate/remove-issue", (req, res) => {
    const { issueId } = req.body;
    const idx = issues.findIndex(i => i.id === issueId);
    if (idx === -1) return res.status(404).json({ error: "Issue not found" });
    issues.splice(idx, 1);
    saveData();
    res.json({ success: true });
});
app.post("/moderate/remove-policy", (req, res) => {
    const { policyId } = req.body;
    const idx = policies.findIndex(p => p.id === policyId);
    if (idx === -1) return res.status(404).json({ error: "Policy not found" });
    policies.splice(idx, 1);
    saveData();
    res.json({ success: true });
});
let allianceCounter = 1;
// --- Simple password hashing (not secure for production) ---
function hash(pw) {
    return require('crypto').createHash('sha256').update(pw).digest('hex');
}

// --- Auth Endpoints ---
// Register
app.post("/auth/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (users[username]) return res.status(400).json({ error: "Username already exists" });
    users[username] = { password: hash(password), empireId: null };
    saveData();
    res.json({ success: true });
});
// Login
app.post("/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const user = users[username];
    if (!user || user.password !== hash(password)) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ success: true, username, empireId: user.empireId });
});

// --- Helper Functions ---
function countInboundEmbargo(targetId) {
    return embargoes.filter(e => e.targetId === targetId).length;
}

// --- Routes ---

// Create a new empire (requires username)
app.post("/empire/create", (req, res) => {
    const { name, planet, username } = req.body;
    if (!name || !planet || !username) return res.status(400).json({ error: "Name, planet, and username required" });
    if (!users[username]) return res.status(401).json({ error: "Invalid user" });
    if (users[username].empireId) return res.status(400).json({ error: "User already has an empire" });

    const newId = Date.now();
    const newEmpire = {
        id: newId,
        empire_name: name,
        planet_name: planet,
        population: 100000,
        economy: 1000,
        military: 50,
        technology: 10,
        influence: 10,
        stability: 100,
        owner: username
    };

    empires[newId] = newEmpire;
    users[username].empireId = newId;
    events.push(`Empire ${name} created on planet ${planet} by ${username}`);
    enforceCaps(newEmpire);
    saveData();
    res.json(newEmpire);
});

// Get empire by ID
app.get("/empire/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const empire = empires[id];
    if (!empire) return res.status(404).json({ error: "Empire not found" });
    res.json(empire);
});

// Get embargoes issued by empire
app.get("/embargoes/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const embs = embargoes.filter(e => e.issuerId === id);
    res.json(embs);
});

// Issue embargo
app.post("/embargo", (req, res) => {
    const { issuerId, targetId, impact } = req.body;
    if (!empires[issuerId] || !empires[targetId]) return res.status(400).json({ error: "Invalid empire IDs" });
    if (countInboundEmbargo(targetId) >= 10) return res.status(400).json({ error: "Target has reached max inbound embargoes" });

    const newEmbargo = { id: Date.now(), issuerId, targetId, impact };
    embargoes.push(newEmbargo);

    // Apply mutual impact
    empires[issuerId].economy -= impact;
    empires[targetId].economy -= impact;
    enforceCaps(empires[issuerId]);
    enforceCaps(empires[targetId]);

    events.push(`Embargo issued by ${empires[issuerId].empire_name} on ${empires[targetId].empire_name}`);
    saveData();
    res.json(newEmbargo);
});

// Get sanctions for alliance
app.get("/sanctions/:allianceId", (req, res) => {
    const allianceId = parseInt(req.params.allianceId);
    const list = sanctions.filter(s => s.allianceId === allianceId);
    res.json(list);
});

// Propose sanction
app.post("/sanction/propose", (req, res) => {
    const { allianceId, targetId, impact } = req.body;
    if (!empires[targetId]) return res.status(400).json({ error: "Invalid target empire" });

    const newSanction = {
        id: Date.now(),
        allianceId,
        targetId,
        votes_for: 1,
        votes_against: 0,
        active: false,
        impact
    };
    sanctions.push(newSanction);

    events.push(`Sanction proposed against ${empires[targetId].empire_name}`);
    saveData();
    res.json(newSanction);
});

// Vote on sanction
app.post("/sanction/vote", (req, res) => {
    const { sanctionId, vote } = req.body;
    const sanction = sanctions.find(s => s.id === sanctionId);
    if (!sanction) return res.status(404).json({ error: "Sanction not found" });

    if (vote) sanction.votes_for++;
    else sanction.votes_against++;

    // Activate if majority (votes_for >= 2)
    if (!sanction.active && sanction.votes_for >= 2) {
        sanction.active = true;
        empires[sanction.targetId].economy -= sanction.impact;
        events.push(`Sanction activated against ${empires[sanction.targetId].empire_name}`);
    }

    saveData();
    res.json(sanction);
});

// Get event feed
app.get("/events", (req, res) => {
    res.json(events);
});

// --- Start server ---
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
