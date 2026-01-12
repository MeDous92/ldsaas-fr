import { useEffect, useState } from "react";
import NotificationCenter from "./components/NotificationCenter";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

export default function EmployeeFeed() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("Employee");

  function formatDuration(val, unitId) {
    if (!val) return "Unknown";
    // Heuristic: if unitId is missing, assume minutes if val > 10, else hours? 
    // Or just "units".
    // 1 -> hours, 2 -> minutes (guessing standard convention or from previous context)
    // Let's assume standard minutes for now if unitId is 2 or undefined/large.

    // Simple logic:
    if (unitId === 1) return `${val} hrs`;
    if (unitId === 2) return `${val} mins`;

    // Fallback based on value
    if (val < 10) return `${val} hrs`;
    return `${val} mins`;
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      // 1. Auth Check
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

      if (!apiBase) {
        if (isMounted) {
          setError("Missing: backend url");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${apiBase}/api/v1/courses/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.status === 401 || res.status === 403) {
          // Token invalid or expired
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem("ldsaas_user_name"); // Also remove user name on logout
          window.location.assign("/login");
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
        const resEnroll = await fetch(`${apiBase}/api/v1/enrollments/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resEnroll.ok) {
          const enrollData = await resEnroll.json();
          if (isMounted) setEnrollments(enrollData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err && err.message ? err.message : "Request failed.");
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
    if (!token || !apiBase) return;

    try {
      const res = await fetch(`${apiBase}/api/v1/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 400) {
          const data = await res.json();
          alert(data.detail || "Enrollment failed. Do you have a manager assigned?");
        } else {
          alert("Failed to enroll.");
        }
        return;
      }

      // Refresh enrollments to update UI
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

  // --- Advanced Filtering Logic ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  // Extract all unique skills/competencies for the filter bar
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

  // Filter courses
  const filteredCourses = courses.filter(course => {
    // 1. Search Query (Name or Provider)
    const query = searchQuery.toLowerCase();
    const matchesSearch = course.name.toLowerCase().includes(query) ||
      (course.provider && course.provider.toLowerCase().includes(query));

    // 2. Tag Filter (Skills/Competencies)
    const courseTags = [...(course.skills || []), ...(course.competencies || [])];
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => courseTags.includes(tag));

    return matchesSearch && matchesTags;
  });

  return (
    <div className="employee-layout">
      {/* Sidebar Navigation */}
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

        <div className="sidebar-footer">
          <a href="/login" className="sidebar-link" onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem("ldsaas_user_name");
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign out
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
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
            <NotificationCenter />
            <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
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
                    const isEnrolled = !!enrollment;
                    const isAssigned = course.assigned_by_manager === true;

                    return (
                      <article key={course.id} className={`feed-card course-card-gamified ${isAssigned ? 'org-quest' : ''}`}>
                        <div className="card-image-box">
                          {course.image ? (
                            <img src={course.image} alt={course.name} className="card-image" />
                          ) : (
                            <div className="card-image-placeholder">
                              <span>{course.provider ? course.provider.slice(0, 2) : "??"}</span>
                            </div>
                          )}
                          <div className="level-badge">Lvl {Math.floor((course.duration || 30) / 10)}</div>
                          {isAssigned && <div className="quest-badge">Organization Quest</div>}
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

                          <div className="card-actions" style={{ marginTop: "auto", paddingTop: "1rem" }}>
                            {!isEnrolled ? (
                              <button
                                className="btn-primary"
                                onClick={() => handleEnroll(course.id)}
                                style={{ width: "100%" }}
                              >
                                {isAssigned ? "Accept Assignment" : "Accept Quest"}
                              </button>
                            ) : (
                              <button
                                className="btn-secondary"
                                disabled
                                style={{
                                  width: "100%",
                                  opacity: 0.9,
                                  cursor: "default",
                                  background: status === 'approved' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 179, 0, 0.1)',
                                  color: status === 'approved' ? '#00cc33' : '#b25e09',
                                  borderColor: status === 'approved' ? '#00cc33' : '#b25e09',
                                  fontWeight: "bold",
                                  borderWidth: "1px",
                                  borderStyle: "solid"
                                }}
                              >
                                {status === 'approved' ? 'Quest Active' : 'Pending Approval'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
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
