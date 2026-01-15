import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import NotificationCenter from "./components/NotificationCenter";
import EmployeeDashboard from "./EmployeeDashboard";
import UserProfile from "./UserProfile";
import GuildRecruitment from "./components/GuildRecruitment";
import AssignmentManager from "./components/AssignmentManager";
import KnowledgeLibrary from "./components/KnowledgeLibrary";
import {
    Map, Scroll, Shield, Users, Star, Trophy, Crown, Briefcase, Target,
    Settings, LayoutDashboard, Compass, LogOut, Search, Bell, CheckCircle,
    ChevronRight, Menu, X, Filter
} from "lucide-react";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

export default function ManagerDashboard() {
    const [activeTab, setActiveTab] = useState("learning"); // dashboard, assignment, invite, learning
    const [userName, setUserName] = useState("Manager");
    const [loading, setLoading] = useState(false);

    // Data States
    const [pendingRequests, setPendingRequests] = useState([]);
    const [teamEnrollments, setTeamEnrollments] = useState([]);
    const [myEnrollments, setMyEnrollments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [myTeam, setMyTeam] = useState([]);
    const [userAvatar, setUserAvatar] = useState(null);

    // Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [assignEmployeeId, setAssignEmployeeId] = useState("");
    const [assignDeadline, setAssignDeadline] = useState("");
    const [selectedAssignees, setSelectedAssignees] = useState([]);

    // Filter/Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(""); // Filter by Assigned Agent

    // Recruit State
    const [recipients, setRecipients] = useState([]);
    const [inviteLogs, setInviteLogs] = useState([]);
    const [inviteUploading, setInviteUploading] = useState(false);
    const [inviteTabEmail, setInviteTabEmail] = useState("");
    const [inviteTabName, setInviteTabName] = useState("");
    const [dragging, setDragging] = useState(false); // New: Dragging state

    // Real Stats (Derived)
    const stats = {
        total_employees: myTeam.length,
        active_missions: teamEnrollments.filter(e => e.status === 'in_progress' || e.status === 'assigned').length,
        completion_rate: teamEnrollments.length > 0
            ? Math.round((teamEnrollments.filter(e => e.status === 'completed').length / teamEnrollments.length) * 100)
            : 0,
        avg_score: 92 // Placeholder until we have scores in DB
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        firstName: "", lastName: "", email: "", role: "", level: "Junior"
    });

    // --- Mapped Data for New UI (Dynamic) ---
    // Active Quests: Manager's own missions (No Limit)
    const activeQuests = myEnrollments
        .filter(e => e.status === 'in_progress' || e.status === 'assigned')
        .map((e, i) => {
            const c = e.course || {};
            // Mock progress if not in DB, else use e.progress
            const progress = e.progress || (e.status === 'assigned' ? 0 : Math.floor(Math.random() * 40) + 10);
            return {
                id: e.id,
                title: c.name || "Unknown Mission",
                type: c.category || 'Skill',
                difficulty: c.level ? `Lvl ${c.level}` : 'Medium',
                reward: (c.duration || 30) * 10 + ' XP',
                progress: progress,
                color: ['blue', 'purple', 'orange', 'pink'][i % 4],
                completed: false
            };
        });

    // Leaderboard: Members sorted by completed missions (Mock XP for now)
    const leaderboard = myTeam.map((m, i) => {
        const completedCount = teamEnrollments.filter(e => e.employee_id === m.id && e.status === 'completed').length;
        return {
            id: m.id,
            name: (m.first_name && m.last_name) ? `${m.first_name} ${m.last_name}` : m.email.split('@')[0],
            role: m.role_title || 'Member', // Assuming DB has this or we mock
            points: completedCount * 500 + 100, // Base XP
            avatar: (m.first_name?.[0] || 'M') + (m.last_name?.[0] || 'E')
        };
    }).sort((a, b) => b.points - a.points).slice(0, 5);

    const handleProfileUpdate = () => {
        fetchProfile(); // Reload avatar/name
    };

    const fetchProfile = () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        fetch(`${apiBase}/api/v1/profiles/me`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(async res => {
            if (res.ok) {
                const profile = await res.json();
                if (profile.first_name || profile.last_name) {
                    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
                    setUserName(fullName);
                    localStorage.setItem("ldsaas_user_name", fullName);
                }
                if (profile.profile_picture_url) {
                    const url = profile.profile_picture_url;
                    setUserAvatar(url.startsWith("http") ? url : `${apiBase}${url}?t=${Date.now()}`);
                }
            }
        }).catch(err => console.error("Failed to load profile", err));
    };

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
            // Expected columns: email, name
            const cleanData = data.map(row => {
                let email = (row.email || row.Email || "").trim();
                let name = (row.name || row.Name || "").trim();

                // Heuristic: Swap
                if (!email.includes("@") && name.includes("@")) { [email, name] = [name, email]; }
                return { email, name, role: 'employee' };
            }).filter(r => r.email && r.email.includes("@"));

            setRecipients(prev => [...prev, ...cleanData]);
            setInviteLogs(prev => [`[System] Scanned ${cleanData.length} recruits from manifest.`, ...prev]);
        };
        reader.readAsBinaryString(file);
    };


    useEffect(() => {
        const storedName = localStorage.getItem("ldsaas_user_name");
        if (storedName) setUserName(storedName);

        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.assign("/login");
            return;
        }

        // Auth Check
        fetch(`${apiBase}/api/v1/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            if (res.ok) return res.json();
            throw new Error("Failed to auth");
        }).then(user => {
            if (user.role !== 'manager' && user.role !== 'admin') {
                window.location.assign("/home");
            }
        }).catch(() => window.location.assign("/login"));

        fetchProfile();
        loadData();
    }, [activeTab]);

    async function loadData() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        setLoading(true);

        try {
            // Always fetch team summary for the dashboard
            const resTeam = await fetch(`${apiBase}/api/v1/enrollments/team`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resTeam.ok) setTeamEnrollments(await resTeam.json());

            // NEW: Fetch User's Own Enrollments (for Active Quests)
            const resMe = await fetch(`${apiBase}/api/v1/enrollments/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resMe.ok) setMyEnrollments(await resMe.json());

            // NEW: Fetch My Team users to resolve IDs to Names in the table
            const resUsers = await fetch(`${apiBase}/api/v1/users/my-team`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resUsers.ok) setMyTeam(await resUsers.json());

            const resPending = await fetch(`${apiBase}/api/v1/enrollments/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resPending.ok) setPendingRequests(await resPending.json());

            // Always fetch courses if logic requires (or lazy load)
            // User wants filtering on "Assign" tab, so we need courses.
            if (activeTab === "assignments") {
                const resCourses = await fetch(`${apiBase}/api/v1/courses/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (resCourses.ok) {
                    const data = await resCourses.json();
                    setCourses(data);

                    // Extract tags
                    const tags = new Set();
                    data.forEach(c => {
                        if (c.skills) c.skills.forEach(s => tags.add(s));
                        if (c.competencies) c.competencies.forEach(t => tags.add(t));
                        // provider as a tag?
                        if (c.provider) tags.add(c.provider);
                    });
                    setAllTags(Array.from(tags));
                }
            }
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    }

    // Derived Filtered Courses
    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (course.description || "").toLowerCase().includes(searchQuery.toLowerCase());

        const courseTags = [...(course.skills || []), ...(course.competencies || []), course.provider];
        const matchesTags = selectedTags.length === 0 || selectedTags.every(t => courseTags.includes(t));

        // Filter by Assigned Employee
        let matchesEmployee = true;
        if (selectedEmployeeFilter) {
            // Must have an active enrollment for this employee
            // Note: teamEnrollments (TeamEnrollmentOut) uses nested .employee and .course objects, NOT flat _id fields
            matchesEmployee = teamEnrollments.some(e =>
                e.course && e.course.id === course.id &&
                e.employee && Number(e.employee.id) === Number(selectedEmployeeFilter) &&
                e.status !== 'completed' && e.status !== 'rejected'
            );
        }

        return matchesSearch && matchesTags && matchesEmployee;
    });

    // Toggle Tag Helper
    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    async function handleApprove(id) {
        const token = localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(`${apiBase}/api/v1/enrollments/${id}/approve`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Optimistic Update
                // 1. Remove from pendingRequests
                setPendingRequests(prev => prev.filter(r => r.id !== id));

                // 2. Add to/Update teamEnrollments (Mocking the processed state or re-fetching)
                // Since we don't have the full object back from approve endpoint with nested data easily without refetch, 
                // we'll just re-fetch team enrollments in bg, or just let the pending list clear.
                // The user specifically asked for "real time update on the dashboard section".
                // The Dashboard stats (Approvals Needed) will update automatically because it depends on pendingRequests.length.

                // Trigger background refresh of team data
                const resTeam = await fetch(`${apiBase}/api/v1/enrollments/team`, { headers: { Authorization: `Bearer ${token}` } });
                if (resTeam.ok) setTeamEnrollments(await resTeam.json());
            }
        } catch (e) { alert("Failed to approve"); }
    }

    // ... handleAssignSubmit ...

    // ...

    // ... render ... 


    async function handleAssignSubmit() {
        const targets = selectedAssignees.length > 0 ? selectedAssignees : (assignEmployeeId ? [assignEmployeeId] : []);

        if (targets.length === 0 || !assignDeadline) {
            alert("Please select at least one employee and a deadline.");
            return;
        }

        const token = localStorage.getItem(TOKEN_KEY);
        let successCount = 0;
        let failCount = 0;

        for (const empId of targets) {
            try {
                const res = await fetch(`${apiBase}/api/v1/enrollments/assign`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        course_id: selectedCourse.id,
                        employee_id: parseInt(empId),
                        deadline: new Date(assignDeadline).toISOString()
                    })
                });

                if (res.ok) successCount++;
                else failCount++;
            } catch (e) {
                console.error(e);
                failCount++;
            }
        }

        if (successCount > 0) {
            alert(`Mission Assigned Successfully to ${successCount} agent(s)!` + (failCount > 0 ? ` (${failCount} failed)` : ""));
            setIsAssignModalOpen(false);
            setAssignEmployeeId("");
            setSelectedAssignees([]);
            setAssignDeadline("");
            loadData();
        } else {
            alert("Failed to assign mission. Check console for details.");
        }
    }

    // --- RECRUIT HANDLERS ---
    const addManualRecruit = (e) => {
        e.preventDefault();
        if (!inviteTabEmail) return;
        setRecipients([...recipients, { email: inviteTabEmail, name: inviteTabName, role: 'employee' }]);
        setInviteTabEmail("");
        setInviteTabName("");
        setInviteLogs(prev => [`[${new Date().toLocaleTimeString()}] Prepare to recruit: ${inviteTabEmail}`, ...prev]);
    };

    const removeRecipient = (idx) => {
        const newArr = [...recipients];
        newArr.splice(idx, 1);
        setRecipients(newArr);
    };

    const launchInvites = async () => {
        if (recipients.length === 0) return;
        setInviteUploading(true);
        const token = localStorage.getItem(TOKEN_KEY);
        let successCount = 0;

        for (let i = 0; i < recipients.length; i++) {
            const recruit = recipients[i];
            try {
                const res = await fetch(`${apiBase}/api/v1/auth/invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ email: recruit.email, name: recruit.name, role: 'employee' })
                });
                if (res.ok) {
                    successCount++;
                    setInviteLogs(prev => [`✅ Sent: ${recruit.email}`, ...prev]);
                } else {
                    const text = await res.text();
                    setInviteLogs(prev => [`❌ Failed ${recruit.email}: ${text.slice(0, 50)}`, ...prev]);
                }
            } catch (err) {
                setInviteLogs(prev => [`⚠️ Error ${recruit.email}`, ...prev]);
            }
        }
        setInviteUploading(false);
        setRecipients([]);
        alert(`Mission Report: ${successCount} invites launched.`);
    };

    // --- Helpers ---
    function formatDuration(val, unitId) {
        if (!val) return "Unknown";
        if (unitId === 1) return `${val} hrs`;
        if (unitId === 2) return `${val} mins`;
        if (val < 10) return `${val} hrs`;
        return `${val} mins`;
    }

    function getEmployeeName(id) {
        const user = myTeam.find(u => u.id === id);
        return user ? (user.name || user.email) : `Agent #${id}`;
    }

    function getAssignedEmployees(courseId) {
        // Find all enrollments for this course
        // Note: teamEnrollments uses nested .course and .employee objects!
        return teamEnrollments
            .filter(e => e.course && e.course.id === courseId && e.status !== 'completed' && e.status !== 'rejected') // Active assignments
            .map(e => {
                // TeamEnrollmentOut has full employee object
                const user = e.employee;
                // Fallback to searching myTeam if needed (though e.employee should be present)
                const fallbackUser = myTeam.find(u => u.id === (user ? user.id : e.employee_id)); // e.employee_id might not exist

                const finalUser = user || fallbackUser;
                const uid = finalUser ? finalUser.id : (e.employee_id || '??');

                return {
                    id: uid,
                    initials: finalUser ? (finalUser.name ? finalUser.name.charAt(0).toUpperCase() : finalUser.email.charAt(0).toUpperCase()) : '?',
                    name: finalUser ? (finalUser.name || finalUser.email) : `ID:${uid}`
                };
            });
    }

    function openAssignModal(course) {
        setSelectedCourse(course);
        setIsAssignModalOpen(true);
    }

    // --- Derived Stats ---
    const activeMissions = teamEnrollments.filter(e => e.status !== 'completed').length;
    const completedMissions = teamEnrollments.filter(e => e.status === 'completed').length;
    const totalXP = completedMissions * 1000; // Mock calculation

    // --- Logout Handler ---
    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("ldsaas_user_name");
        window.location.assign("/login");
    };

    // --- Profile Dropdown State ---
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
            {/* Mobile Menu Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-72 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex flex-col h-full p-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-xl shadow-lg flex items-center justify-center">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                            Mission<span className="font-light text-indigo-300">Control</span>
                        </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        <NavItem icon={LayoutDashboard} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} isOpen={true} />
                        <NavItem icon={Map} label="Active Quests" isActive={activeTab === 'assignments'} onClick={() => { setActiveTab('assignments'); setIsSidebarOpen(false); }} isOpen={true} />
                        <NavItem icon={Users} label="Guild Hall" isActive={activeTab === 'recruit'} onClick={() => { setActiveTab('recruit'); setIsSidebarOpen(false); }} isOpen={true} />
                        <NavItem icon={Scroll} label="Library" isActive={activeTab === 'learning'} onClick={() => { setActiveTab('learning'); setIsSidebarOpen(false); }} isOpen={true} />
                        <NavItem icon={Compass} label="My Profile" isActive={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} isOpen={true} />
                    </nav>

                    {/* Pro Banner */}
                    <div className="mt-8 p-4 rounded-2xl bg-indigo-800/50 border border-indigo-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <h4 className="relative z-10 font-bold text-sm mb-1">L&D Premium</h4>
                        <p className="relative z-10 text-xs text-indigo-200 mb-3">Unlock advanced analytics and AI coaching.</p>
                        <button className="relative z-10 w-full py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors">
                            Upgrade Guild
                        </button>
                    </div>

                    {/* User */}
                    <div className="mt-8 pt-6 border-t border-indigo-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-sm border-2 border-indigo-600">
                            {userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate">{userName}</h4>
                            <p className="text-xs text-indigo-300 truncate">Manager • Lvl 5</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-indigo-800 text-indigo-300 hover:text-white transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 z-30 sticky top-0">
                    <div className="flex items-center justify-between px-8 py-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                    {activeTab === 'dashboard' && <>Welcome back, {userName} <span className="text-2xl">👋</span></>}
                                    {activeTab === 'assignments' && "Mission Management"}
                                    {activeTab === 'recruit' && "Guild Recruitment"}
                                    {activeTab === 'learning' && "Knowledge Library"}
                                    {activeTab === 'profile' && "Hero Profile"}
                                </h2>
                                <p className="hidden md:block text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
                                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 bg-slate-100/50 rounded-full px-4 py-2 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-48 text-slate-700 placeholder-slate-400" />
                            </div>
                            <button className="relative p-3 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all" onClick={() => setActiveTab('profile')}>
                                {userAvatar ? (
                                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-indigo-700">{userName.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">

                    {/* DASHBOARD HOME VIEW */}
                    {activeTab === 'dashboard' && (
                        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard data={{ label: 'Total Guild Members', value: stats.total_employees || '0', trend: '+12%', icon: Users, color: 'bg-indigo-500', lightColor: 'bg-indigo-500' }} />
                                <StatCard data={{ label: 'Active Missions', value: stats.active_missions || '0', trend: '+5%', icon: Target, color: 'bg-orange-500', lightColor: 'bg-orange-500' }} />
                                <StatCard data={{ label: 'Completion Rate', value: `${stats.completion_rate || 0}%`, trend: '+2.4%', icon: CheckCircle, color: 'bg-emerald-500', lightColor: 'bg-emerald-500' }} />
                                <StatCard data={{ label: 'Guild Score', value: stats.avg_score || '0', trend: '+8%', icon: Trophy, color: 'bg-yellow-500', lightColor: 'bg-yellow-500' }} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column */}
                                <div className="lg:col-span-2 space-y-8">
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                                <Map className="w-5 h-5 text-indigo-500" />
                                                Active Quests
                                            </h3>
                                            <button onClick={() => setActiveTab('assignments')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                                View All Missions
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {activeQuests.length > 0 ? activeQuests.map(q => (
                                                <QuestCard key={q.id} quest={q} onClick={() => { }} />
                                            )) : (
                                                <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                                                    No active quests found. Start a mission!
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-8">
                                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-100 border border-slate-100 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                                        <h3 className="relative z-10 text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-yellow-500" />
                                            Guild Champions
                                        </h3>
                                        <div className="relative z-10 space-y-4">
                                            {leaderboard.map((user, index) => (
                                                <div key={user.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group">
                                                    <div className="font-black text-slate-300 w-4 text-center group-hover:text-indigo-400">{index + 1}</div>
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {user.avatar}
                                                        </div>
                                                        {index === 0 && <div className="absolute -top-2 -right-1 text-yellow-400"><Crown className="w-4 h-4 fill-current" /></div>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-800 text-sm">{user.name}</h4>
                                                        <p className="text-xs text-slate-500 font-medium">{user.role}</p>
                                                    </div>
                                                    <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                        {user.points}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <QuickActionTile icon={Briefcase} label="Budget" color="bg-pink-500" onClick={() => { }} />
                                        <QuickActionTile icon={Users} label="Recruit" color="bg-cyan-500" onClick={() => setActiveTab('recruit')} />
                                        <QuickActionTile icon={Target} label="Goals" color="bg-orange-500" onClick={() => { }} />
                                        <QuickActionTile icon={Settings} label="Config" color="bg-slate-500" onClick={() => setActiveTab('profile')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OTHER TABS - Encapsulated in the new layout */}

                    {activeTab === 'assignments' && (
                        <AssignmentManager
                            courses={courses}
                            myTeam={myTeam}
                            teamEnrollments={teamEnrollments}
                            onAssignClick={openAssignModal}
                        />
                    )}

                    {activeTab === 'recruit' && (
                        <GuildRecruitment
                            recipients={recipients}
                            setRecipients={setRecipients}
                            inviteLogs={inviteLogs}
                            setInviteLogs={setInviteLogs}
                            inviteUploading={inviteUploading}
                            launchInvites={launchInvites}
                            removeRecipient={removeRecipient}
                        />
                    )}

                    {activeTab === 'learning' && (
                        <KnowledgeLibrary
                            courses={courses}
                            myEnrollments={myEnrollments}
                            token={localStorage.getItem(TOKEN_KEY)}
                            apiBase={apiBase}
                            onRefresh={loadData}
                        />
                    )}

                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                            <UserProfile isEmbedded={true} onProfileUpdate={handleProfileUpdate} />
                        </div>
                    )}

                </div>

                {/* Modals placed here if needed, or outside */}
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)}></div>
                        <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Assign Mission</h2>
                            <p className="text-slate-500 mb-6">Assign <strong>{selectedCourse?.name}</strong> to your guild members.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Select Members</label>
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                                        {myTeam.map(member => (
                                            <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAssignees.includes(member.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAssignees([...selectedAssignees, member.id]);
                                                        else setSelectedAssignees(selectedAssignees.filter(id => id !== member.id));
                                                    }}
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{member.initials}</div>
                                                <span className="font-bold text-slate-700 text-sm">{member.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Deadline</label>
                                    <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setIsAssignModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                                    <button onClick={handleAssignSubmit} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">Confirm Assignment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// --- New Design Sub-Components ---

function NavItem({ icon: Icon, label, isActive, onClick, isOpen }) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group relative overflow-hidden
                ${isActive ? 'bg-indigo-600 shadow-lg shadow-indigo-900/20 text-white' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}
            `}
        >
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full"></div>
            )}
            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'animate-bounce-subtle' : ''}`} />
            <span className={`font-medium text-sm whitespace-nowrap transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-0 md:group-hover:opacity-100 md:hidden'}`}>
                {label}
            </span>
        </button>
    );
}

function StatCard({ data }) {
    const Icon = data.icon;
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${data.lightColor} text-white group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${data.color.replace('bg-', 'text-')}`} />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    {data.trend}
                </span>
            </div>
            <div>
                <h4 className="text-slate-500 text-sm font-semibold mb-1">{data.label}</h4>
                <span className="text-3xl font-black text-slate-800 tracking-tight">{data.value}</span>
            </div>
        </div>
    );
}

function QuestCard({ quest, onClick }) {
    return (
        <div onClick={onClick} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
            {/* Background Progress Bar (Subtle) */}
            <div className="absolute bottom-0 left-0 h-1 bg-slate-50 w-full">
                <div
                    className={`h-full bg-${quest.color}-500 opacity-20`}
                    style={{ width: `${quest.progress}%` }}
                ></div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
                {/* Quest Status Icon */}
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2
                    ${quest.completed
                        ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                        : `bg-${quest.color}-50 border-${quest.color}-100 text-${quest.color}-600`}
                `}>
                    {quest.completed ? <CheckCircle className="w-6 h-6" /> : <Map className="w-6 h-6" />}
                </div>

                {/* Quest Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-bold text-slate-800 truncate ${quest.completed && 'line-through opacity-50'}`}>
                            {quest.title}
                        </h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide bg-${quest.color}-100 text-${quest.color}-700`}>
                            {quest.type}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" /> {quest.difficulty || 'Medium'}
                        </span>
                        <span className="flex items-center gap-1 text-amber-600">
                            <Star className="w-3 h-3 text-amber-500" /> {quest.reward || '100 XP'}
                        </span>
                    </div>
                </div>

                {/* Action / Progress */}
                <div className="text-right shrink-0">
                    {quest.completed ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                            Complete!
                        </span>
                    ) : (
                        <div className="flex flex-col items-end gap-1 w-24">
                            <span className="text-xs font-bold text-slate-400">{quest.progress}% Done</span>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full bg-${quest.color}-500 rounded-full`} style={{ width: `${quest.progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ActivityItem({ icon: Icon, iconColor, title, time, desc }) {
    return (
        <div className="relative flex gap-4">
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${iconColor}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="pb-6">
                <p className="text-sm font-bold text-slate-800">{title} <span className="text-slate-400 font-normal ml-2 text-xs">{time}</span></p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

function QuickActionTile({ icon: Icon, label, color, onClick }) {
    return (
        <button onClick={onClick} className={`
            flex flex-col items-center justify-center gap-3 p-4 rounded-2xl text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all
            ${color}
        `}>
            <Icon className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}
