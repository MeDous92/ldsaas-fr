import React, { useState, useMemo } from 'react';
import { Search, Filter, Briefcase, Tag, Users, Clock, Plus } from 'lucide-react';

export default function AssignmentManager({
    courses,
    myTeam,
    teamEnrollments,
    onAssignClick
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");
    const [filterAssignee, setFilterAssignee] = useState("all");

    // --- Helper: Get Assigned Employees for a Course ---
    const getAssignedEmployees = (courseId) => {
        const enrollmentMap = new Map();
        teamEnrollments
            .filter(e => e.course_id === courseId)
            .forEach(e => {
                const emp = myTeam.find(m => m.id === e.employee_id);
                if (emp) enrollmentMap.set(emp.id, emp);
            });
        return Array.from(enrollmentMap.values());
    };

    // --- Derived Data ---
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.tags && c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
            const matchesCategory = filterCategory === "all" || c.category === filterCategory;

            let matchesAssignee = true;
            if (filterAssignee !== "all") {
                const assigned = getAssignedEmployees(c.id);
                matchesAssignee = assigned.some(a => a.id === parseInt(filterAssignee));
            }

            return matchesSearch && matchesCategory && matchesAssignee;
        });
    }, [courses, searchQuery, filterCategory, filterAssignee, teamEnrollments, myTeam]);

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

    // Format Duration
    const formatDuration = (val, unitId) => {
        if (!val) return "Self-paced";
        const unit = unitId === 2 ? 'hours' : unitId === 3 ? 'days' : 'mins';
        return `${val} ${unit}`;
    };

    // Extract unique categories for filter
    const allCategories = useMemo(() => [...new Set(courses.map(c => c.category || "Uncategorized"))], [courses]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20 backdrop-blur-md bg-white/90">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Mission Command</h2>
                    <p className="text-slate-500 text-sm">Select missions to assign to your guild.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex-1 md:flex-none">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            className="bg-transparent outline-none text-sm w-full md:w-32"
                            placeholder="Search missions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {/* Category Filter */}
                    <select
                        className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {/* Assignee Filter */}
                    <select
                        className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                        value={filterAssignee}
                        onChange={e => setFilterAssignee(e.target.value)}
                    >
                        <option value="all">Any Assignee</option>
                        {myTeam.map(m => <option key={m.id} value={m.id}>Assigned to: {m.name}</option>)}
                    </select>

                    <button onClick={() => {/* Maybe create custom? */ }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="Create Custom Mission">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Course Grid (Categorized) */}
            {Object.keys(categorizedCourses).length > 0 ? (
                Object.entries(categorizedCourses).map(([category, items]) => (
                    <div key={category} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                <Tag className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">{category}</h3>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full border border-slate-200">{items.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map(course => {
                                const assignees = getAssignedEmployees(course.id);
                                return (
                                    <article key={course.id} className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all p-4 shadow-sm hover:shadow-md flex flex-col group h-full">
                                        <div className="h-40 bg-slate-100 rounded-xl mb-4 overflow-hidden relative">
                                            {course.image ? (
                                                <img src={course.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={course.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-4xl bg-gradient-to-br from-slate-50 to-slate-100">
                                                    {(course.name || "C").charAt(0)}
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md border border-white/20">
                                                Lvl {course.level || Math.floor((course.duration || 30) / 10)}
                                            </div>
                                            {course.provider && (
                                                <div className="absolute bottom-2 left-2 bg-white/90 text-slate-800 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                                    {course.provider}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-2">
                                            <h4 className="font-bold text-slate-800 text-base leading-tight line-clamp-2" title={course.name}>{course.name}</h4>
                                        </div>

                                        <div className="text-xs text-slate-500 mb-4 flex items-center gap-3">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(course.duration, course.duration_unit_id)}</span>
                                            {course.tags && course.tags.length > 0 && <span className="px-2 py-0.5 bg-slate-100 rounded-md truncate max-w-[100px]">{course.tags[0]}</span>}
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex -space-x-2 overflow-hidden py-1 pl-1">
                                                {assignees.slice(0, 3).map(a => (
                                                    <div key={a.id} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-sm" title={a.name}>
                                                        {a.initials}
                                                    </div>
                                                ))}
                                                {assignees.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                                                        +{assignees.length - 3}
                                                    </div>
                                                )}
                                                {assignees.length === 0 && <span className="text-xs text-slate-400 italic pl-1 flex items-center">No agents assigned</span>}
                                            </div>
                                            <button
                                                onClick={() => onAssignClick(course)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                    <Filter className="w-16 h-16 mx-auto mb-4 opacity-20 text-indigo-500" />
                    <h3 className="text-lg font-bold text-slate-600 mb-1">No missions found</h3>
                    <p className="text-sm">Try adjusting your filters or search terms.</p>
                </div>
            )}
        </div>
    );
}
