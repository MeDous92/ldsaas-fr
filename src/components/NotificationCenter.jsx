import { useEffect, useState, useRef } from "react";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        const token = localStorage.getItem("ldsaas_access_token");
        if (!token || !apiBase) return;

        console.log("[Notification Debug] Fetching notifications...");
        // console.log("[Notification Debug] Token:", token.slice(0, 10) + "..."); // optional security

        try {
            const res = await fetch(`${apiBase}/api/v1/enrollments/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("[Notification Debug] Response Status:", res.status);

            if (res.ok) {
                const data = await res.json();
                console.log("[Notification Debug] Data received:", data);
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            } else {
                console.error("[Notification Debug] Fetch failed with status:", res.status);
                try {
                    const errText = await res.text();
                    console.error("[Notification Debug] Error body:", errText);
                } catch (e) { }
            }
        } catch (err) {
            console.error("[Notification Debug] Network/Parse Error:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    // ... (rest of code)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen(!isOpen);

    const [showAll, setShowAll] = useState(false);

    const markAsRead = async (id, e) => {
        e.stopPropagation();
        const token = localStorage.getItem("ldsaas_access_token");
        if (!token) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await fetch(`${apiBase}/api/v1/enrollments/notifications/${id}/read`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to mark read", err);
        }
    };

    const displayedNotifications = showAll
        ? notifications
        : notifications.filter(n => !n.is_read);

    return (
        <div className="notification-center" ref={dropdownRef} style={{ position: "relative" }}>
            <button
                className="btn-icon"
                onClick={toggleOpen}
                title="Notifications"
                style={{ background: "none", border: "none", cursor: "pointer", position: "relative", color: "var(--text-color, #333)" }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: "-2px",
                        right: "-2px",
                        background: "red",
                        color: "white",
                        fontSize: "10px",
                        borderRadius: "50%",
                        width: "14px",
                        height: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown" style={{
                    position: "absolute",
                    top: "120%",
                    right: "0",
                    width: "300px",
                    background: "white",
                    border: "1px solid #eee",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "400px",
                    overflowY: "auto"
                }}>
                    <div style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "600", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Notifications</span>
                        <div style={{ fontSize: "11px", display: "flex", gap: "8px" }}>
                            <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                                <input
                                    type="checkbox"
                                    checked={showAll}
                                    onChange={(e) => setShowAll(e.target.checked)}
                                    style={{ marginRight: "4px" }}
                                />
                                Show All
                            </label>
                        </div>
                    </div>
                    {displayedNotifications.length === 0 ? (
                        <div style={{ padding: "12px", color: "#888", textAlign: "center" }}>
                            {showAll ? "No notifications" : "No new notifications"}
                            <div style={{ fontSize: "10px", marginTop: "1rem", borderTop: "1px dashed #ccc", paddingTop: "0.5rem", textAlign: "left" }}>
                                <strong>Debug Info:</strong><br />
                                API: {apiBase || "Missing"}<br />
                                Total: {notifications.length}<br />
                                Unread: {unreadCount}<br />
                                Last Check: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    ) : (
                        <div>
                            {displayedNotifications.map(n => (
                                <div key={n.id} style={{
                                    padding: "12px",
                                    borderBottom: "1px solid #f5f5f5",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    opacity: n.is_read ? 0.6 : 1,
                                    background: n.is_read ? "#f9f9f9" : "white"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ fontWeight: n.is_read ? "400" : "600", fontSize: "14px" }}>{n.title}</div>
                                        {!n.is_read && (
                                            <button
                                                onClick={(e) => markAsRead(n.id, e)}
                                                title="Mark as read"
                                                style={{ border: "none", background: "none", cursor: "pointer", color: "#0070f3", fontSize: "18px", padding: 0, lineHeight: 1 }}
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#555" }}>{n.body}</div>
                                    {n.metadata && n.metadata.approver_name && (
                                        <div style={{ fontSize: "12px", color: "#007079", fontStyle: "italic" }}>
                                            Approved by: {n.metadata.approver_name}
                                        </div>
                                    )}
                                    <div style={{ fontSize: "11px", color: "#999" }}>{new Date(n.created_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
