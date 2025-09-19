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

// --- In-memory data ---
let empires = {};       // player-created empires
let embargoes = [];     // { id, issuerId, targetId, impact }
let sanctions = [];     // { id, allianceId, targetId, votes_for, votes_against, active, impact }
let events = [];        // logs actions
let allianceCounter = 1;

// --- Helper Functions ---
function countInboundEmbargo(targetId) {
    return embargoes.filter(e => e.targetId === targetId).length;
}

// --- Routes ---

// Create a new empire
app.post("/empire/create", (req, res) => {
    const { name, planet } = req.body;
    if (!name || !planet) return res.status(400).json({ error: "Name and planet required" });

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
        stability: 100
    };

    empires[newId] = newEmpire;
    events.push(`Empire ${name} created on planet ${planet}`);
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

    events.push(`Embargo issued by ${empires[issuerId].empire_name} on ${empires[targetId].empire_name}`);
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

    res.json(sanction);
});

// Get event feed
app.get("/events", (req, res) => {
    res.json(events);
});

// --- Start server ---
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
