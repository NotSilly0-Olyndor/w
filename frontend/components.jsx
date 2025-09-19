/*
Proprietary Software
Copyright (c) 2025 Ethan Harriott. All Rights Reserved.
Unauthorized copying, modification, or distribution of this file is strictly prohibited.
*/

const { useState } = React;

export function AdBanner() {
    return (
        <div style={{
            width: "100%",
            height: "100px",
            backgroundColor: "#eee",
            color: "#333",
            textAlign: "center",
            lineHeight: "100px",
            margin: "10px 0",
            border: "1px solid #ccc"
        }}>
            Advertisement Banner
        </div>
    );
}

export function EmpireDashboard({ empire }) {
    if (!empire) return null;
    return (
        <div style={{ border: "1px solid #444", padding: "20px", marginBottom: "20px" }}>
            <h2>{empire.empire_name} ({empire.planet_name})</h2>
            <p><b>Population:</b> {empire.population}</p>
            <p><b>Economy:</b> {empire.economy}</p>
            <p><b>Military:</b> {empire.military}</p>
            <p><b>Technology:</b> {empire.technology}</p>
            <p><b>Influence:</b> {empire.influence}</p>
            <p><b>Stability:</b> {empire.stability}</p>
        </div>
    );
}

export function EmbargoList({ embargoes, targetEmbargo, setTargetEmbargo, onIssue }) {
    return (
        <div style={{ border: "1px solid #444", padding: "20px", marginBottom: "20px" }}>
            <h3>Embargoes</h3>
            <ul>
                {embargoes.map(e => <li key={e.id}>Target Empire ID: {e.targetId}, Impact: {e.impact}%</li>)}
            </ul>
            <input type="number" placeholder="Target Empire ID" value={targetEmbargo} onChange={e => setTargetEmbargo(e.target.value)} />
            <button onClick={onIssue}>Issue Embargo</button>
        </div>
    );
}

export function SanctionPanel({ sanctions, targetSanction, setTargetSanction, onPropose, onVote }) {
    return (
        <div style={{ border: "1px solid #444", padding: "20px", marginBottom: "20px" }}>
            <h3>Alliance Sanctions</h3>
            <ul>
                {sanctions.map(s => (
                    <li key={s.id}>
                        Target Empire ID: {s.targetId}, Votes: {s.votes_for}/{s.votes_against}, Active: {s.active ? "Yes" : "No"}
                        <button onClick={() => onVote(s.id, true)}>Vote Yes</button>
                        <button onClick={() => onVote(s.id, false)}>Vote No</button>
                    </li>
                ))}
            </ul>
            <input type="number" placeholder="Target Empire ID" value={targetSanction} onChange={e => setTargetSanction(e.target.value)} />
            <button onClick={onPropose}>Propose Sanction</button>
        </div>
    );
}

export function EventFeed({ events }) {
    return (
        <div style={{ border: "1px solid #444", padding: "20px", marginBottom: "20px" }}>
            <h3>Event Feed</h3>
            <ul>
                {events.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
        </div>
    );
}
