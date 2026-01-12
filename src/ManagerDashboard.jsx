import { useState, useEffect } from "react";
import NotificationCenter from "./components/NotificationCenter";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

export default function ManagerDashboard() {
    const [activeTab, setActiveTab] = useState("approvals");
    const [userName, setUserName] = useState("Manager");
    const [loading, setLoading] = useState(false);

    // Data States
    const [pendingRequests, setPendingRequests] = useState([]);
    const [teamEnrollments, setTeamEnrollments] = useState([]);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        const storedName = localStorage.getItem("ldsaas_user_name");
        if (storedName) setUserName(storedName);

        loadData();
    }, [activeTab]);

    async function loadData() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        setLoading(true);

        try {
            if (activeTab === "approvals") {
                const res = await fetch(`${apiBase}/api/v1/enrollments/pending`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) setPendingRequests(await res.json());
            }
            else if (activeTab === "team") {
                const res = await fetch(`${apiBase}/api/v1/enrollments/team`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) setTeamEnrollments(await res.json());
            }
            else if (activeTab === "catalog") {
                const res = await fetch(`${apiBase}/api/v1/courses/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Also fetch enrollments to know who is enrolled? 
                // For catalog we just want to see courses and maybe "Assign" them (Global Assignment)
                if (res.ok) setCourses(await res.json());
            }
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id) {
        const token = localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(`${apiBase}/api/v1/enrollments/${id}/approve`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setPendingRequests(prev => prev.filter(r => r.id !== id));
                // Optional: Show toast
            }
        } catch (e) { alert("Failed to approve"); }
    }

    async function handleAssign(courseId) {
        const token = localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(`${apiBase}/api/v1/courses/${courseId}/assign`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Refresh courses
                const updated = await res.json();
                setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
            }
        } catch (e) { alert("Failed to assign"); }
    }

    // Helper for Duration
    function formatDuration(val, unitId) {
        if (!val) return "Unknown";
        if (unitId === 1) return `${val} hrs`;
        if (unitId === 2) return `${val} mins`;
        if (val < 10) return `${val} hrs`;
        return `${val} mins`;
    }

    // Determine Role
    const isManager = window.location.pathname === "/manager";
    const isAdmin = window.location.pathname === "/admin";

    return (
        <div className="manager-layout" style={{ background: "#f8f9fa", minHeight: "100vh" }}>
            {/* Header */}
            <header className="top-bar" style={{ background: "white", padding: "1rem 2rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div className="logo-box" style={{
                        width: 40, height: 40, background: "linear-gradient(135deg, #1d4ea6, #2b6fde)",
                        color: "white", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: "bold"
                    }}>LD</div>
                    <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Manager Hub</div>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                    <button onClick={() => window.location.assign("/invite")} className="btn-primary" style={{ padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}>
                        + Invite Talent
                    </button>
                    <div style={{ height: "24px", width: "1px", background: "#eee" }}></div>
                    <NotificationCenter />
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{userName.charAt(0)}</div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{userName}</span>
                    </div>
                    <button
                        onClick={() => { localStorage.removeItem(TOKEN_KEY); window.location.assign("/login"); }}
                        style={{ color: "#666", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 2rem" }}>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #eee", paddingBottom: "1px" }}>
                    {["approvals", "team", "catalog"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "1rem 0",
                                background: "none",
                                border: "none",
                                borderBottom: activeTab === tab ? "2px solid #2b6fde" : "2px solid transparent",
                                color: activeTab === tab ? "#2b6fde" : "#666",
                                fontWeight: activeTab === tab ? "700" : "500",
                                fontSize: "1rem",
                                cursor: "pointer",
                                marginRight: "1.5rem",
                                marginBottom: "-2px",
                                textTransform: "capitalize"
                            }}
                        >
                            {tab === "approvals" ? `Approvals ${pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}` : tab === "team" ? "Team Progress" : "Course Catalog"}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Loading data...</div>
                ) : (
                    <>
                        {/* APPROVALS TAB */}
                        {activeTab === "approvals" && (
                            <div className="tab-content">
                                {pendingRequests.length === 0 ? (
                                    <div className="empty-state" style={{ background: "white", padding: "3rem", borderRadius: "16px", textAlign: "center", border: "1px solid #eee" }}>
                                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
                                        <h3>All caught up!</h3>
                                        <p style={{ color: "#666" }}>No pending enrollment requests from your team.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gap: "1rem" }}>
                                        {pendingRequests.map(req => (
                                            <div key={req.id} style={{ background: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                                                <div>
                                                    <div style={{ fontWeight: "700", fontSize: "1.1rem", marginBottom: "4px" }}>Request #{req.id}</div>
                                                    <div style={{ color: "#666", fontSize: "0.9rem" }}>
                                                        Employee ID: <span style={{ fontFamily: "monospace", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px" }}>{req.employee_id}</span>
                                                        &nbsp;&bull;&nbsp;
                                                        Course ID: <span style={{ fontFamily: "monospace", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px" }}>{req.course_id}</span>
                                                    </div>
                                                    <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "4px" }}>Requested: {new Date(req.requested_at).toLocaleDateString()}</div>
                                                </div>
                                                <button onClick={() => handleApprove(req.id)} className="btn-primary" style={{ background: "#00cc33" }}>Approve Request</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TEAM PROGRESS TAB */}
                        {activeTab === "team" && (
                            <div className="tab-content">
                                {teamEnrollments.length === 0 ? (
                                    <div className="empty-state" style={{ background: "white", padding: "3rem", borderRadius: "16px", textAlign: "center", border: "1px solid #eee" }}>
                                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
                                        <h3>No activity yet</h3>
                                        <p style={{ color: "#666" }}>Your team hasn't enrolled in any courses yet.</p>
                                    </div>
                                ) : (
                                    <div style={{ background: "white", borderRadius: "16px", border: "1px solid #eee", overflow: "hidden" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #eee" }}>
                                                <tr>
                                                    <th style={{ padding: "1rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#666" }}>Employee</th>
                                                    <th style={{ padding: "1rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#666" }}>Course ID</th>
                                                    <th style={{ padding: "1rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#666" }}>Date</th>
                                                    <th style={{ padding: "1rem", fontSize: "0.85rem", textTransform: "uppercase", color: "#666" }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teamEnrollments.map(enr => (
                                                    <tr key={enr.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                                        <td style={{ padding: "1rem", fontWeight: "500" }}>ID: {enr.employee_id}</td>
                                                        <td style={{ padding: "1rem", color: "#555" }}>{enr.course_id}</td>
                                                        <td style={{ padding: "1rem", color: "#888", fontSize: "0.9rem" }}>{new Date(enr.requested_at).toLocaleDateString()}</td>
                                                        <td style={{ padding: "1rem" }}>
                                                            <span style={{
                                                                padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600",
                                                                background: enr.status === 'approved' ? '#e6fffa' : '#fff5eb',
                                                                color: enr.status === 'approved' ? '#007079' : '#b25e09'
                                                            }}>
                                                                {enr.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CATALOG TAB */}
                        {activeTab === "catalog" && (
                            <div className="grid-feed" style={{ marginTop: 0 }}>
                                {courses.map(course => (
                                    <article key={course.id} className={`feed-card course-card-gamified ${course.assigned_by_manager ? 'org-quest' : ''}`}>
                                        <div className="card-image-box">
                                            {course.image ? (
                                                <img src={course.image} alt={course.name} className="card-image" />
                                            ) : (
                                                <div className="card-image-placeholder">
                                                    <span>{course.provider ? course.provider.slice(0, 2) : "??"}</span>
                                                </div>
                                            )}
                                            <div className="level-badge">Lvl {Math.floor((course.duration || 30) / 10)}</div>
                                            {course.assigned_by_manager && <div className="quest-badge">Assigned</div>}
                                        </div>
                                        <div className="card-body">
                                            <div className="card-tags">
                                                {course.skills && course.skills.slice(0, 3).map((skill, idx) => (
                                                    <span key={idx} className="skill-badge">{skill}</span>
                                                ))}
                                            </div>
                                            <h4>{course.name}</h4>
                                            <div className="card-meta">
                                                <span className="badge">{course.provider}</span>
                                                <span className="duration">{formatDuration(course.duration, course.duration_unit_id)}</span>
                                            </div>
                                            <div className="card-actions" style={{ marginTop: "1rem" }}>
                                                <button
                                                    className="btn-primary"
                                                    style={{ width: "100%", background: course.assigned_by_manager ? "#ccc" : "#4f46e5", cursor: course.assigned_by_manager ? "default" : "pointer" }}
                                                    onClick={() => !course.assigned_by_manager && handleAssign(course.id)}
                                                >
                                                    {course.assigned_by_manager ? "Assigned" : "Assign to Team"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
