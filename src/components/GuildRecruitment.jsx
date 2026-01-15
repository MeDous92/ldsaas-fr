import React, { useState } from 'react';
import { UserPlus, Upload, FileText, Mail, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GuildRecruitment({
    recipients,
    setRecipients,
    inviteLogs,
    setInviteLogs,
    inviteUploading,
    launchInvites,
    removeRecipient
}) {
    const [inviteTabEmail, setInviteTabEmail] = useState("");
    const [inviteTabName, setInviteTabName] = useState("");
    const [dragging, setDragging] = useState(false);

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
                if (!email.includes("@") && name.includes("@")) { [email, name] = [name, email]; }
                return { email, name, role: 'employee' };
            }).filter(r => r.email && r.email.includes("@"));

            setRecipients(prev => [...prev, ...cleanData]);
            setInviteLogs(prev => [`[System] Scanned ${cleanData.length} recruits from manifest.`, ...prev]);
        };
        reader.readAsBinaryString(file);
    };

    const addManualRecruit = (e) => {
        e.preventDefault();
        if (!inviteTabEmail) return;
        setRecipients([...recipients, { email: inviteTabEmail, name: inviteTabName, role: 'employee' }]);
        setInviteTabEmail("");
        setInviteTabName("");
        setInviteLogs(prev => [`[${new Date().toLocaleTimeString()}] Prepared to recruit: ${inviteTabEmail}`, ...prev]);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Guild Recruitment</h2>
                    <p className="text-slate-500 mt-1">Summon new members to join your guild.</p>
                </div>
                {recipients.length > 0 && (
                    <button
                        onClick={launchInvites}
                        disabled={inviteUploading}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        {inviteUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                        Send {recipients.length} Summons
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Input Handling */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Manual Add Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4">
                            <UserPlus className="w-5 h-5 text-indigo-500" />
                            Direct Summon
                        </h3>
                        <form onSubmit={addManualRecruit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Hero Name"
                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                                value={inviteTabName}
                                onChange={e => setInviteTabName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                                    value={inviteTabEmail}
                                    onChange={e => setInviteTabEmail(e.target.value)}
                                />
                                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                                    <UserPlus className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        className={`
                            border-3 border-dashed rounded-3xl p-10 text-center transition-all duration-300
                            ${dragging
                                ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                                : 'border-slate-200 bg-slate-50 hover:border-indigo-300'}
                        `}
                    >
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                            <Upload className={`w-8 h-8 ${dragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg mb-1">Bulk Summon (CSV)</h4>
                        <p className="text-sm text-slate-500 mb-6">Drag and drop your manifest here</p>
                        <label className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer hover:bg-slate-50 hover:border-indigo-200 transition-all">
                            Browse Files
                            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                        </label>
                    </div>

                    {/* Pending Recruits List */}
                    {recipients.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-5">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                                <span>Pending Summons</span>
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">{recipients.length}</span>
                            </h3>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {recipients.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                {r.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{r.name}</p>
                                                <p className="text-xs text-slate-500">{r.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeRecipient(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col: Logs */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl h-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-20"></div>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            Summoning Logs
                        </h3>
                        <div className="space-y-3 font-mono text-xs max-h-[500px] overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-indigo-800 scrollbar-track-transparent pr-2">
                            {inviteLogs.length === 0 ? (
                                <p className="text-slate-600 italic">No activity recorded...</p>
                            ) : (
                                inviteLogs.map((log, i) => (
                                    <div key={i} className="border-l-2 border-indigo-800 pl-3 py-1">
                                        <p>{log}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
