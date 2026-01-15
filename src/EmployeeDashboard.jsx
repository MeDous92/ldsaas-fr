import { useEffect, useState } from "react";
import NotificationCenter from "./components/NotificationCenter";
import UserProfile from "./UserProfile";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

export default function EmployeeDashboard({ isEmbedded = false }) {
    const [activeTab, setActiveTab] = useState("home");
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userName, setUserName] = useState("Employee");
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return window.location.assign("/login");

        const storedName = localStorage.getItem("ldsaas_user_name");
        if (storedName) setUserName(storedName);

        try {
            // Fetch Courses
            const res = await fetch(`${apiBase}/api/v1/courses/`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 401) {
                localStorage.removeItem(TOKEN_KEY);
                return window.location.assign("/login");
            }
            if (res.ok) setCourses(await res.json());

            // Fetch Enrollments
            const resEnr = await fetch(`${apiBase}/api/v1/enrollments/me`, { headers: { Authorization: `Bearer ${token}` } });
            if (resEnr.ok) setEnrollments(await resEnr.json());

        } catch (err) {
            console.error(err);
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    }

    async function handleEnroll(courseId) {
        const token = localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(`${apiBase}/api/v1/courses/${courseId}/enroll`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert("Enrollment requested!");
                loadData(); // Refresh to show pending status
            } else {
                alert("Failed to enroll.");
            }
        } catch (e) { console.error(e); }
    }

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("ldsaas_user_name");
        window.location.assign("/login");
    };

    // --- Helpers ---
    function formatDuration(val, unitId) {
        if (unitId === 1) return `${val} hrs`;
        return `${val} mins`;
    }

    const allTags = Array.from(new Set(courses.flatMap(c => [...(c.skills || []), ...(c.competencies || [])]))).sort();

    const filteredCourses = courses.filter(course => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = course.name.toLowerCase().includes(query) || (course.provider && course.provider.toLowerCase().includes(query));
        const courseTags = [...(course.skills || []), ...(course.competencies || [])];
        const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => courseTags.includes(tag));
        return matchesSearch && matchesTags;
    }).sort((a, b) => {
        // Prioritize assigned/enrolled
        const enrA = enrollments.find(e => e.course_id === a.id);
        const enrB = enrollments.find(e => e.course_id === b.id);
        if (enrA && !enrB) return -1;
        if (!enrA && enrB) return 1;
        return 0;
    });

    return (
        <div className={isEmbedded ? "employee-embedded" : "employee-layout"} style={isEmbedded ? { display: "block", background: "transparent", minHeight: "auto" } : {}}>
            {/* Sidebar */}
            {!isEmbedded && (
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <div className="logo-box">L&D</div>
                    </div>

                    <nav className="nav-menu">
                        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            <span>Home</span>
                        </button>
                        <button className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`} onClick={() => setActiveTab('learning')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                            <span>My Learning</span>
                        </button>
                        <button className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                            <span>Explore</span>
                        </button>
                        <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span>My Profile</span>
                        </button>
                    </nav>

                    <div className="sidebar-footer" style={{ borderTop: "1px solid #e1e7ef", paddingTop: "16px", marginTop: "auto" }}>
                        <button onClick={handleLogout} className="sidebar-link" style={{ background: "transparent", border: "none", color: "#e53e3e", cursor: "pointer", width: "100%", display: "flex", gap: 10, padding: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            Sign out
                        </button>
                    </div>
                </aside>
            )}

            <main className="main-content" style={isEmbedded ? { padding: "0", maxWidth: "100%", margin: "0" } : {}}>
                {/* Embedded Navigation */}
                {isEmbedded && (
                    <div className="embedded-nav" style={{
                        borderBottom: "1px solid #e2e8f0",
                        marginBottom: "32px",
                        display: "flex",
                        gap: "32px",
                        paddingBottom: "1px" // Adjust for border overlap
                    }}>
                        {[
                            { id: 'home', label: 'Home Feed' },
                            { id: 'learning', label: 'My Learning' },
                            { id: 'explore', label: 'Explore & Enroll' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    borderBottom: activeTab === tab.id ? "3px solid #2b6cb0" : "3px solid transparent",
                                    fontWeight: activeTab === tab.id ? "700" : "500",
                                    paddingbottom: "12px",
                                    cursor: "pointer",
                                    color: activeTab === tab.id ? "#2b6cb0" : "#718096",
                                    fontSize: "15px",
                                    transition: "all 0.2s"
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Header - Show unless Profile & Not Embedded */}
                {activeTab !== 'profile' && !isEmbedded && (
                    <header className="top-bar">
                        <div className="greeting">
                            <h1>Welcome, {userName}</h1>
                            <p>Ready to level up your skills today?</p>
                        </div>
                        <div className="user-actions">
                            <div className="search-bar">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                            <NotificationCenter />
                            <div className="avatar" onClick={() => setActiveTab('profile')} style={{ cursor: "pointer" }}>
                                {userName.charAt(0)}
                            </div>
                        </div>
                    </header>
                )}

                {/* --- VIEW: HOME (Feed) --- */}
                {activeTab === 'home' && (
                    <div className="feed-container">
                        <section className="feed-section">
                            <div className="hero-banner">
                                <div className="hero-text">
                                    <div className="tag">Weekly Spotlight</div>
                                    <h2>{courses[0]?.name || "Mastering L&D"}</h2>
                                    <p>Featured course to boost your skills.</p>
                                    <button className="btn-primary" onClick={() => setActiveTab('explore')}>Start Learning</button>
                                </div>
                                <div className="hero-visual"><div className="glass-card card-1"></div><div className="glass-card card-2"></div></div>
                            </div>
                        </section>

                        {/* My Active Missions (Enrolled) */}
                        {enrollments.length > 0 && (
                            <section className="feed-section">
                                <div className="section-header">
                                    <h3>My Active Missions</h3>
                                    <button className="link-btn" onClick={() => setActiveTab('learning')}>View all</button>
                                </div>
                                <div className="grid-feed">
                                    {enrollments.slice(0, 4).map(enr => {
                                        const c = courses.find(x => x.id === enr.course_id);
                                        if (!c) return null;
                                        return (
                                            <CourseCard key={c.id} course={c} enrollment={enr} onEnroll={() => { }} />
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Recommendations */}
                        <section className="feed-section">
                            <h3>Recommended for you</h3>
                            <div className="grid-feed">
                                {filteredCourses.slice(0, 4).map(course => {
                                    const enrollment = enrollments.find(e => e.course_id === course.id);
                                    return (
                                        <CourseCard key={course.id} course={course} enrollment={enrollment} onEnroll={() => handleEnroll(course.id)} />
                                    )
                                })}
                            </div>
                        </section>

                        {/* All Available Missions (Full Catalog) */}
                        <section className="feed-section" style={{ marginTop: "32px", borderTop: "1px solid #e1e7ef", paddingTop: "32px" }}>
                            <div className="section-header">
                                <h3>All Available Missions</h3>
                                <span style={{ fontSize: "12px", color: "#718096" }}>{filteredCourses.length} courses available</span>
                            </div>
                            <div className="grid-feed">
                                {filteredCourses.map(course => {
                                    const enrollment = enrollments.find(e => e.course_id === course.id);
                                    return (
                                        <CourseCard key={`all-${course.id}`} course={course} enrollment={enrollment} onEnroll={() => handleEnroll(course.id)} />
                                    )
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {/* --- VIEW: MY LEARNING --- */}
                {activeTab === 'learning' && (
                    <div className="feed-container">
                        <h2>My Learning</h2>
                        <div className="grid-feed">
                            {enrollments.length === 0 ? <p>No enrollments yet.</p> : enrollments.map(enr => {
                                const c = courses.find(x => x.id === enr.course_id);
                                if (!c) return null;
                                return <CourseCard key={c.id} course={c} enrollment={enr} onEnroll={() => { }} />
                            })}
                        </div>
                    </div>
                )}

                {/* --- VIEW: EXPLORE --- */}
                {activeTab === 'explore' && (
                    <div className="feed-container">
                        <h2>Explore Courses</h2>
                        {/* Filter Bar */}
                        <div className="filter-tags" style={{ marginBottom: 20 }}>
                            {allTags.map(tag => (
                                <button key={tag} className={`filter-tag ${selectedTags.includes(tag) ? 'active' : ''}`} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                        <div className="grid-feed">
                            {filteredCourses.map(c => {
                                const enr = enrollments.find(e => e.course_id === c.id);
                                return <CourseCard key={c.id} course={c} enrollment={enr} onEnroll={() => handleEnroll(c.id)} />
                            })}
                        </div>
                    </div>
                )}

                {/* --- VIEW: PROFILE --- */}
                {activeTab === 'profile' && (
                    <div style={{ padding: "0 20px" }}>
                        <UserProfile isEmbedded={true} />
                    </div>
                )}

            </main>
        </div>
    );
}

function CourseCard({ course, enrollment, onEnroll }) {
    const isEnrolled = !!enrollment;
    const isAssigned = isEnrolled && !!enrollment.deadline;

    function formatDuration(val, unitId) {
        if (!val) return "Unknown";
        if (unitId === 1) return `${val} hrs`;
        if (unitId === 2) return `${val} mins`;
        if (val < 10) return `${val} hrs`;
        return `${val} mins`;
    }

    return (
        <article className={`feed-card course-card-gamified ${isAssigned ? 'org-quest' : ''}`} style={isAssigned ? { border: "2px solid #ed8936", transform: "scale(1.02)", boxShadow: "0 8px 24px rgba(237,137,54,0.2)" } : {}}>
            <div className="card-image-box">
                {course.image ? (
                    <img src={course.image} alt={course.name} className="card-image" />
                ) : (
                    <div className="card-image-placeholder">
                        {course.provider ? course.provider.slice(0, 2) : "??"}
                    </div>
                )}
                <div className="level-badge">Lvl {Math.floor((course.duration || 30) / 10)}</div>

                {isAssigned && !isEnrolled && (
                    /* Logic check: isAssigned usually implies isEnrolled in frontend logic if passed as enrollment prop.
                       But if we want to show "Assigned" badge even if enrolled, we can just check isAssigned.
                       Wait, the user wants it to look like Manager View but for Employee.
                       The Manager View shows ASSIGNEES. Employee View shows STATUS.
                    */
                    <div className="quest-badge" style={{ position: "absolute", top: 10, right: 10, background: "#c05621", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.3)", zIndex: 5 }}>⚠️ ASSIGNED MISSION</div>
                )}
                {isAssigned && (
                    <div className="quest-badge" style={{ position: "absolute", top: 10, right: 10, background: "#c05621", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.3)", zIndex: 5 }}>⚠️ ASSIGNED MISSION</div>
                )}
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
                    <span className="duration">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {formatDuration(course.duration, course.duration_unit_id)}
                    </span>
                </div>

                {isAssigned && (
                    <div style={{ marginTop: "8px", padding: "8px", background: "#fffaf0", borderRadius: "6px", border: "1px dashed #ed8936", fontSize: "12px", color: "#c05621" }}>
                        <strong>Manager's Orders:</strong><br />
                        Deadline: {new Date(enrollment.deadline).toLocaleDateString()}
                    </div>
                )}

                <div className="card-actions" style={{ marginTop: "auto", paddingTop: "1rem" }}>
                    {!isEnrolled ? (
                        <button className="btn-primary" onClick={onEnroll} style={{ width: "100%", background: "linear-gradient(135deg, #3182ce, #2b6cb0)" }}>Accept Quest</button>
                    ) : (
                        <button className="btn-secondary" disabled style={{ width: "100%", opacity: 0.9, cursor: "default", background: enrollment.status === 'approved' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 179, 0, 0.1)', color: enrollment.status === 'approved' ? '#00cc33' : '#b25e09', borderColor: enrollment.status === 'approved' ? '#00cc33' : '#b25e09', fontWeight: "bold", borderWidth: "1px", borderStyle: "solid" }}>
                            {enrollment.status === 'approved' ? 'QUEST ACTIVE' : 'PENDING APPROVAL'}
                        </button>
                    )}
                </div>
            </div>
        </article>
    )
}
