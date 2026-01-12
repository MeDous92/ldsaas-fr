import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

export default function InvitePage() {
    const [recipients, setRecipients] = useState([]);
    const [manualEmail, setManualEmail] = useState("");
    const [manualName, setManualName] = useState("");
    const [manualRole, setManualRole] = useState("employee");
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]); // "Mission logs"

    // Auth Check
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("ldsaas_access_token");
        if (!token) {
            window.location.assign("/login");
            return;
        }
        // Basic role check from local storage (secure check happens on backend)
        const name = localStorage.getItem("ldsaas_user_name");
        // We could decode token, but for UI toggles this is "ok" if we trust the initial login redirect
        // Ideally we fetch /auth/me, but let's check if we can guess from stored role? 
        // We didn't store role explicitly except implied by URL. 
        // Let's assume ANYONE accessing this page is authorized by the Router protective wrapper (which we will add).
        // For the "Role" dropdown, we strictly need to know if I am admin.
        // Let's fetch /me to be sure.
        fetch(`${apiBase}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
            if (data.role === 'admin') setIsAdmin(true);
        }).catch(() => { });
    }, []);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files[0]);
    };

    const handleFile = (file) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            // Expected columns: email, name, role (optional)
            const cleanData = data.map(row => {
                let email = (row.email || row.Email || "").trim();
                let name = (row.name || row.Name || "").trim();
                const role = (row.role || row.Role || "employee").toLowerCase();

                // Heuristic: Auto-fix swapped columns (Name in Email col, Email in Name col)
                if (!email.includes("@") && name.includes("@")) {
                    const temp = email;
                    email = name;
                    name = temp;
                }

                return { email, name, role };
            }).filter(r => r.email && r.email.includes("@")); // Must have valid-ish email

            setRecipients([...recipients, ...cleanData]);
            addLog(`Scanned ${cleanData.length} new recruits from manifest.`);
        };
        reader.readAsBinaryString(file);
    };

    const addManual = (e) => {
        e.preventDefault();
        if (!manualEmail) return;
        setRecipients([...recipients, { email: manualEmail, name: manualName, role: manualRole }]);
        setManualEmail("");
        setManualName("");
        setManualRole("employee");
        addLog(`Recruit ${manualEmail} added to squad.`);
    };

    const removeRecipient = (idx) => {
        const newArr = [...recipients];
        newArr.splice(idx, 1);
        setRecipients(newArr);
    };

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const launchMission = async () => {
        if (recipients.length === 0) return;
        setUploading(true);
        setProgress(0);
        addLog("Initializing launch sequence...");

        const token = localStorage.getItem("ldsaas_access_token");
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < recipients.length; i++) {
            const recruit = recipients[i];
            try {
                const body = {
                    email: recruit.email,
                    name: recruit.name,
                    // Only admins can send 'role'. Backend will ignore/fail if Manager sends it, 
                    // or we can strictly filter it here.
                    // Implementation plan said "Update backend to allow role".
                    role: isAdmin ? recruit.role : undefined
                };

                const res = await fetch(`${apiBase}/api/v1/auth/invite`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    successCount++;
                    addLog(`✅ Signal reached ${recruit.email}`);
                } else {
                    failCount++;
                    const ej = await res.json().catch(() => ({}));
                    const errMsg = typeof ej.detail === 'object' ? JSON.stringify(ej.detail) : (ej.detail || res.status);
                    addLog(`❌ Failed to signal ${recruit.email}: ${errMsg}`);
                }
            } catch (err) {
                failCount++;
                addLog(`⚠️ Transmission error for ${recruit.email}`);
            }
            setProgress(Math.round(((i + 1) / recipients.length) * 100));
        }

        setUploading(false);
        if (successCount > 0) {
            setRecipients([]); // Clear only on success? Or keep failed? 
            // For now clear all to avoid double send, logs show what happened.
            addLog(`MISSION COMPLETE. ${successCount} recruited, ${failCount} MIA.`);
        } else {
            addLog("MISSION ABORTED. No signals confirmed.");
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "0.5rem", background: "linear-gradient(90deg, #0070f3, #00c6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Team Builder Protocol
            </h1>
            <p style={{ color: "#666", marginBottom: "2rem" }}>Assemble your dream team. Upload manifest or add agents manually.</p>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
                {/* Left Panel: Inputs */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                    {/* Bulk Upload Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        style={{
                            border: `2px dashed ${dragging ? "#0070f3" : "#ccc"}`,
                            borderRadius: "12px",
                            padding: "3rem",
                            textAlign: "center",
                            background: dragging ? "rgba(0,112,243,0.05)" : "white",
                            transition: "all 0.2s ease",
                            cursor: "pointer",
                            position: "relative"
                        }}
                    >
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={(e) => { if (e.target.files.length) handleFile(e.target.files[0]); }}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                        />
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
                        <h3 style={{ margin: 0 }}>Drop Mission Manifest</h3>
                        <p style={{ color: "#888", fontSize: "0.9rem" }}>Excel or CSV (email, name, role)</p>
                    </div>

                    {/* Manual Entry */}
                    <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid #eaeaea", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <h3 style={{ marginTop: 0 }}>Manual Recruitment</h3>
                        <form onSubmit={addManual} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <input
                                type="email"
                                placeholder="Agent Email"
                                value={manualEmail}
                                onChange={e => setManualEmail(e.target.value)}
                                style={{ flex: 1, padding: "0.8rem", borderRadius: "8px", border: "1px solid #ddd", minWidth: "200px" }}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Codename (Optional)"
                                value={manualName}
                                onChange={e => setManualName(e.target.value)}
                                style={{ flex: 0.8, padding: "0.8rem", borderRadius: "8px", border: "1px solid #ddd" }}
                            />
                            {isAdmin && (
                                <select
                                    value={manualRole}
                                    onChange={e => setManualRole(e.target.value)}
                                    style={{ padding: "0.8rem", borderRadius: "8px", border: "1px solid #ddd" }}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                </select>
                            )}
                            <button
                                type="submit"
                                style={{
                                    background: "#333",
                                    color: "white",
                                    border: "none",
                                    padding: "0 1.5rem",
                                    borderRadius: "8px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                + Add
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Panel: Squad List & Logs */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ background: "#fafafa", padding: "1.5rem", borderRadius: "12px", border: "1px solid #eaeaea", maxHeight: "400px", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0 }}>Recruitment Squad</h3>
                            <span style={{ background: "#eee", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.8rem" }}>{recipients.length} Ready</span>
                        </div>

                        {recipients.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#999", padding: "2rem 0" }}>Waiting for inputs...</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {recipients.map((r, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "0.8rem", borderRadius: "8px", border: "1px solid #eee" }}>
                                        <div>
                                            <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{r.email}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#666" }}>{r.name || "Unknown"} • {r.role}</div>
                                        </div>
                                        <button onClick={() => removeRecipient(idx)} style={{ border: "none", background: "none", color: "#ff4444", cursor: "pointer" }}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={launchMission}
                        disabled={uploading || recipients.length === 0}
                        style={{
                            width: "100%",
                            padding: "1rem",
                            background: uploading ? "#ccc" : "linear-gradient(90deg, #0070f3, #00c6ff)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            cursor: uploading || recipients.length === 0 ? "not-allowed" : "pointer",
                            boxShadow: "0 4px 12px rgba(0,112,243,0.3)"
                        }}
                    >
                        {uploading ? `Launching... ${progress}%` : "🚀 LAUNCH INVITES"}
                    </button>

                    <div style={{ background: "#111", color: "#00ff41", padding: "1rem", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.8rem", height: "150px", overflowY: "auto" }}>
                        {logs.length === 0 && <div>System online. Ready for commands.</div>}
                        {logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
