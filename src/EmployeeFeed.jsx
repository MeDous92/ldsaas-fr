import { useEffect, useState } from "react";
import NotificationCenter from "./components/NotificationCenter";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

export default function EmployeeFeed({ isEmbedded = false }) {
  const [activeTab, setActiveTab] = useState("home");
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("Employee");

  function formatDuration(val, unitId) {
    if (!val) return "Unknown";
    if (unitId === 1) return `${val} hrs`;
    if (unitId === 2) return `${val} mins`;
    if (val < 10) return `${val} hrs`;
    return `${val} mins`;
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      // 1. Auth Check - Skip if embedded? No, manager needs token too.
      // But if embedded, we might assume manager is already authed.
      // However, fetch calls need token.
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        window.location.assign("/login");
        return;
      }

      // Load user name
      const storedName = localStorage.getItem("ldsaas_user_name");
      if (storedName && isMounted) {
        setUserName(storedName);
      }

      try {
        const res = await fetch(`${apiBase}/api/v1/courses/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem("ldsaas_user_name");
          window.location.assign("/login");
          return;
        }

        if (res.status === 403) {
          // If embedded (Manager), they should have access if backend allows.
          // If backend restricts GET /courses to employee role, this might fail for manager.
          // Assuming Custom backend allows it or Manager has implicit read access.
          setError("Access denied to course feed.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          try {
            const payload = await res.json();
            if (payload && payload.detail) message = payload.detail;
          } catch (_) { }
          throw new Error(message);
        }
        const payload = await res.json();
        if (isMounted) {
          setCourses(Array.isArray(payload) ? payload : []);
        }

        // Fetch enrollments
        // If manager, this fetches THEIR enrollments.
        // If manager is not an employee, this might return empty or error.
        // We will assume manager can view courses even if enrollment fetch fails.
        const resEnroll = await fetch(`${apiBase}/api/v1/enrollments/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resEnroll.ok) {
          const enrollData = await resEnroll.json();
          if (isMounted) setEnrollments(enrollData);
        }
      } catch (err) {
        console.error("Feed Load Error:", err);
        if (isMounted) {
          const errorDetail = `Error: ${err.name} - ${err.message}`;
          setError(errorDetail);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleEnroll(courseId) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(`${apiBase}/api/v1/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Failed to enroll (Status: ${res.status})`;
        try {
          const data = JSON.parse(text);
          if (data.detail) errorMsg += `: ${data.detail}`;
        } catch (e) { }
        alert(errorMsg);
        return;
      }

      const resEnroll = await fetch(`${apiBase}/api/v1/enrollments/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resEnroll.ok) {
        const enrollData = await resEnroll.json();
        setEnrollments(enrollData);
      }

      alert("Enrollment requested successfully!");

    } catch (err) {
      console.error("Enrollment error:", err);
      alert("An error occurred while enrolling.");
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const allTags = Array.from(new Set(
    courses.flatMap(c => [
      ...(c.skills || []),
      ...(c.competencies || [])
    ])
  )).sort();

  function toggleTag(tag) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  const filteredCourses = courses.filter(course => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = course.name.toLowerCase().includes(query) ||
      (course.provider && course.provider.toLowerCase().includes(query));

    const courseTags = [...(course.skills || []), ...(course.competencies || [])];
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => courseTags.includes(tag));

    return matchesSearch && matchesTags;
  }).sort((a, b) => {
    const enrA = enrollments.find(e => e.course_id === a.id);
    const enrB = enrollments.find(e => e.course_id === b.id);

    const isAssignedA = enrA && enrA.deadline;
    const isAssignedB = enrB && enrB.deadline;

    if (isAssignedA && !isAssignedB) return -1;
    if (!isAssignedA && isAssignedB) return 1;
    return 0;
  });

  // --- Logout Handler ---
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("ldsaas_user_name");
    window.location.assign("/login");
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (isEmbedded) {
    return (
      <div className="feed-container" style={{ padding: 0 }}>
        {/* --- CONTENT ONLY (No Sidebar/Header) --- */}

        {/* Hero Banner */}
        <section className="feed-section">
          <div className="hero-banner">
            <div className="hero-text">
              <div className="tag">Weekly Spotlight</div>
              <h2>{courses[0]?.name || "Mastering L&D"}</h2>
              <p>Featured course to boost your skills.</p>
              <button className="btn-primary" onClick={() => { }} style={{ cursor: "default" }}>Start Learning</button>
            </div>
            <div className="hero-visual"><div className="glass-card card-1"></div><div className="glass-card card-2"></div></div>
          </div>
        </section>

        {/* Continue Learning Snippet */}
        {enrollments.length > 0 && (
          <section className="feed-section">
            <div className="section-header">
              <h3>Continue Learning</h3>
            </div>
            <div className="scroll-row">
              {enrollments.slice(0, 3).map(enr => {
                const c = courses.find(x => x.id === enr.course_id);
                return (
                  <div key={enr.id} className="continue-card">
                    <div className="continue-progress" style={{ width: enr.status === 'approved' ? '20%' : '5%' }}></div>
                    <div className="continue-content">
                      <span className="course-cat">{enr.status}</span>
                      <h4>{c?.name || 'Course'}</h4>
                    </div>
                  </div>
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
      </div>
    );
  }

  // STANDARD LAYOUT
  return (
    <div className="employee-layout">
      {/* Sidebar Navigation - Hide if embedded */}
      {!isEmbedded && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-box">L&D</div>
          </div>

          <nav className="nav-menu">
            <button className="nav-item active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>Home</span>
            </button>
            <button className="nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span>My Learning</span>
            </button>
            <button className="nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              <span>Explore</span>
            </button>
            <button className="nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2z"></path></svg>
              <span>Bookmarks</span>
            </button>
          </nav>

          <div className="sidebar-footer" style={{ borderTop: "1px solid #e1e7ef", paddingTop: "16px", marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
            <a href="/login" className="sidebar-link" onClick={handleLogout} style={{ color: "#e53e3e" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sign out
            </a>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className={isEmbedded ? "main-embedded" : "main-content"}>
        {/* Hide Top Bar if embedded to avoid double header or use simple one? 
            User wanted it embedded "inside the dashboard page.. all in one place".
            Dashboard has a header. EmployeeFeed has a header.
            If we keep EmployeeFeed header, it has search and "Welcome User".
            Dashboard header has "Mission Control".
            Double headers might look weird.
            But removing it breaks search/filter placement unless we refactor.
            Let's keep it for now as "My Learning" sub-view.
        */}
        <header className="top-bar">
          <div className="greeting">
            <h1>Welcome, {userName}</h1>
            <p>Ready to level up your skills today?</p>
          </div>
          <div className="user-actions">
            <div className="search-bar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="text"
                placeholder="Search for courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Hide Notif Center if embedded because dashboard has one? 
                ManagerDashboard.jsx imports NotificationCenter.
                EmployeeFeed imports NotificationCenter.
                If embedded, we have two notification centers.
                Should we hide it?
                Let's hide it if embedded.
            */}
            {!isEmbedded && <NotificationCenter />}
            {isEmbedded && <div style={{ width: 32 }}></div>}

            <div style={{ position: "relative" }}>
              <div
                className="avatar"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ cursor: "pointer" }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              {isProfileOpen && (
                <div style={{
                  position: "absolute", top: "110%", right: 0,
                  background: "white", border: "1px solid #e2e8f0",
                  borderRadius: "12px", padding: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  width: "160px", zIndex: 50
                }}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #edf2f7", marginBottom: "4px" }}>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "#2d3748" }}>{userName}</div>
                    <div style={{ fontSize: "12px", color: "#718096" }}>Employee</div>
                  </div>
                  <button
                    onClick={() => window.location.assign("/profile")}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 12px",
                      background: "white", border: "none", color: "#4a5568",
                      borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px"
                    }}
                    onMouseEnter={e => e.target.style.background = "#f7fafc"}
                    onMouseLeave={e => e.target.style.background = "white"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 12px",
                      background: "white", border: "none", color: "#e53e3e",
                      borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px"
                    }}
                    onMouseEnter={e => e.target.style.background = "#fff5f5"}
                    onMouseLeave={e => e.target.style.background = "white"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="feed-container">
          {/* Dynamic Hero Section */}
          <section className="feed-section">
            <div className="hero-banner">
              <div className="hero-text">
                <div className="tag">Weekly Spotlight</div>
                <h2>{courses.length > 0 ? courses[0].name : "Mastering Design Systems"}</h2>
                <p>{courses.length > 0 ? `Featured course from ${courses[0].provider}` : "Learn how to build scalable and consistent user interfaces with our new advanced course."}</p>
                <button className="btn-primary">Start Learning</button>
              </div>
              <div className="hero-visual">
                <div className="glass-card card-1"></div>
                <div className="glass-card card-2"></div>
              </div>
            </div>
          </section>

          {/* Continue Learning Row */}
          <section className="feed-section">
            <div className="section-header">
              <h3>Continue Learning</h3>
              <button className="link-btn">View all</button>
            </div>
            <div className="scroll-row">
              {enrollments.length === 0 ? (
                <div style={{ color: "#888", padding: "1rem" }}>You haven't enrolled in any courses yet.</div>
              ) : (
                enrollments.map(enroll => {
                  const course = courses.find(c => c.id === enroll.course_id);
                  return (
                    <div key={enroll.id} className="continue-card">
                      <div className="continue-progress" style={{ width: enroll.status === 'approved' ? '10%' : '5%' }}></div>
                      <div className="continue-content">
                        <span className="course-cat">{enroll.status}</span>
                        <h4>{course ? course.name : `Course #${enroll.course_id}`}</h4>
                        <p>{enroll.status === 'approved' ? 'Ready to start' : 'Waiting approval'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Filter Bar */}
          <section className="feed-section">
            <div className="filter-bar-container">
              <div className="filter-label">Filter by skills:</div>
              <div className="filter-tags">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`filter-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Recommended Grid */}
          <section className="feed-section">
            <div className="section-header">
              <h3>{searchQuery || selectedTags.length > 0 ? `Search Results (${filteredCourses.length})` : "Recommended for you"}</h3>
            </div>

            {loading && <div className="loading-state">Loading your personalized feed...</div>}
            {error && <div className="error-state">{error}</div>}

            {!loading && !error && (
              <div className="grid-feed">
                {courses.length === 0 ? (
                  <div className="empty-state">No courses found right now.</div>
                ) : (
                  filteredCourses.map(course => {
                    const enrollment = enrollments.find(e => e.course_id === course.id);
                    return (
                      <CourseCard key={course.id} course={course} enrollment={enrollment} onEnroll={() => handleEnroll(course.id)} />
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
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
    <article className={`feed-card course-card-gamified ${isAssigned ? 'org-quest' : ''}`}
      style={isAssigned ? { border: "2px solid #ed8936", transform: "scale(1.02)", boxShadow: "0 8px 24px rgba(237,137,54,0.2)" } : {}}
    >
      <div className="card-image-box">
        {course.image ? (
          <img src={course.image} alt={course.name} className="card-image" />
        ) : (
          <div className="card-image-placeholder">
            <span>{course.provider ? course.provider.slice(0, 2) : "??"}</span>
          </div>
        )}
        <div className="level-badge">Lvl {Math.floor((course.duration || 30) / 10)}</div>

        {isAssigned && (
          <div className="quest-badge" style={{
            background: "#c05621", color: "white",
            position: "absolute", top: 10, right: 10,
            padding: "4px 8px", borderRadius: "4px",
            fontSize: "11px", fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            zIndex: 5
          }}>
            ⚠️ ASSIGNED MISSION
          </div>
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
            <button
              className="btn-primary"
              onClick={onEnroll}
              style={{ width: "100%" }}
            >
              Accept Quest
            </button>
          ) : (
            <button
              className="btn-secondary"
              disabled={isAssigned}
              style={{
                width: "100%",
                opacity: 0.9,
                cursor: "default",
                background: enrollment.status === 'approved' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 179, 0, 0.1)',
                color: enrollment.status === 'approved' ? '#00cc33' : '#b25e09',
                borderColor: enrollment.status === 'approved' ? '#00cc33' : '#b25e09',
                fontWeight: "bold",
                borderWidth: "1px",
                borderStyle: "solid"
              }}
            >
              {isAssigned ? 'MISSION ACTIVE' : (enrollment.status === 'approved' ? 'QUEST ACTIVE' : 'PENDING APPROVAL')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

