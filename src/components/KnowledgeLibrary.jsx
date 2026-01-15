import React, { useState, useMemo } from 'react';
import { Search, Filter, BookOpen, Play, CheckCircle, Clock, Star, Zap } from 'lucide-react';

export default function KnowledgeLibrary({
    courses,
    myEnrollments,
    token,
    apiBase,
    onRefresh
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");
    const [enrollLoading, setEnrollLoading] = useState(null);

    // --- Actions ---
    const handleEnroll = async (courseId) => {
        setEnrollLoading(courseId);
        try {
            const res = await fetch(`${apiBase}/api/v1/courses/${courseId}/enroll`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert("Mission Accepted! You have enrolled in this course.");
                onRefresh();
            } else {
                const txt = await res.text();
                alert("Failed to enroll: " + txt);
            }
        } catch (e) {
            console.error(e);
            alert("Error enrolling in course.");
        } finally {
            setEnrollLoading(null);
        }
    };

    // --- Derived Data ---
    const enrolledCourseIds = useMemo(() => new Set(myEnrollments.map(e => e.course_id)), [myEnrollments]);

    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.tags && c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
            const matchesCategory = filterCategory === "all" || c.category === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [courses, searchQuery, filterCategory]);

    // Group by Category
    const categorizedCourses = useMemo(() => {
        const groups = {};
        filteredCourses.forEach(c => {
            const cat = c.category || "Uncategorized";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(c);
        });
        return groups;
    }, [filteredCourses]);

    // Categories
    const allCategories = useMemo(() => [...new Set(courses.map(c => c.category || "Uncategorized"))], [courses]);

    return (
        <div className="space-y-12 animate-in fade-in duration-500">

            {/* My Active Missions Section (If any) */}
            {myEnrollments.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        <h2 className="text-2xl font-black text-slate-800">My Active Missions</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myEnrollments.map(enrollment => {
                            const c = enrollment.course || {};
                            const progress = enrollment.progress || 0;
                            return (
                                <div key={enrollment.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                            {(c.name || "M").charAt(0)}
                                        </div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                            {enrollment.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-1 line-clamp-1" title={c.name}>{c.name}</h3>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{c.description || "No description."}</p>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                                        <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>{progress}% Complete</span>
                                        <button className="text-indigo-600 hover:text-indigo-800 hover:underline">Continue</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Catalog Section */}
            <section>
                {/* Controls */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center mb-8 sticky top-0 z-20 backdrop-blur-md bg-white/90">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-indigo-500" />
                            Knowledge Library
                        </h2>
                        <p className="text-slate-500 text-sm">Explore new skills and enroll in missions.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex-1 md:flex-none">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                className="bg-transparent outline-none text-sm w-full md:w-40"
                                placeholder="Search library..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Categories */}
                {Object.keys(categorizedCourses).length > 0 ? (
                    Object.entries(categorizedCourses).map(([category, items]) => (
                        <div key={category} className="mb-10 last:mb-0">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-2 h-6 bg-cyan-500 rounded-full"></span>
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {items.map(course => {
                                    const isEnrolled = enrolledCourseIds.has(course.id);
                                    return (
                                        <div key={course.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full">
                                            <div className="h-32 bg-slate-100 relative">
                                                {course.image ? (
                                                    <img src={course.image} className="w-full h-full object-cover" alt={course.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 font-black text-3xl">
                                                        {course.name.charAt(0)}
                                                    </div>
                                                )}
                                                {course.provider && (
                                                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                                        {course.provider}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <h4 className="font-bold text-slate-800 mb-1 line-clamp-2" title={course.name}>{course.name}</h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration || "?"}m</span>
                                                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {course.level || "Beginner"}</span>
                                                </div>
                                                <div className="mt-auto">
                                                    {isEnrolled ? (
                                                        <button disabled className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default">
                                                            <CheckCircle className="w-4 h-4" /> Enrolled
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEnroll(course.id)}
                                                            disabled={enrollLoading === course.id}
                                                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            {enrollLoading === course.id ? (
                                                                <span className="animate-spin">⌛</span>
                                                            ) : (
                                                                <>
                                                                    <Play className="w-3 h-3 fill-current" /> Start Mission
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        <p>No courses found matching your criteria.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
