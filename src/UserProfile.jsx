import React, { useState, useEffect, useRef } from "react";

const TOKEN_KEY = "ldsaas_access_token";
const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

export default function UserProfile({ isEmbedded = false, onProfileUpdate }) {
    const [activeSection, setActiveSection] = useState("personal");
    const [profile, setProfile] = useState(null);
    const [countries, setCountries] = useState([]);
    const [educationLevels, setEducationLevels] = useState([]);
    const [dependents, setDependents] = useState([]);
    const [cities, setCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [avatarTs, setAvatarTs] = useState(Date.now());
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (profile?.country_id) {
            fetchCities(profile.country_id);
        } else {
            setCities([]);
        }
    }, [profile?.country_id]);

    const fetchCities = async (countryId) => {
        const token = localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(`${apiBase}/api/v1/profiles/cities/${countryId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setCities(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadData = async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.assign("/login");
            return;
        }

        try {
            setIsLoading(true);
            const headers = { Authorization: `Bearer ${token}` };

            const [pRes, cRes, eRes, dRes] = await Promise.all([
                fetch(`${apiBase}/api/v1/profiles/me`, { headers }),
                fetch(`${apiBase}/api/v1/profiles/countries`, { headers }),
                fetch(`${apiBase}/api/v1/profiles/education-levels`, { headers }),
                fetch(`${apiBase}/api/v1/profiles/dependents`, { headers })
            ]);

            if (pRes.status === 401) {
                window.location.assign("/login");
                return;
            }

            if (pRes.ok) {
                const pData = await pRes.json();
                setProfile(pData);
                // Pre-load cities if country exists
                if (pData.country_id) {
                    // We can call fetchCities here or let the useEffect handle it.
                    // useEffect will handle it once profile is set.
                }
            }
            if (cRes.ok) setCountries(await cRes.json());
            if (eRes.ok) setEducationLevels(await eRes.json());
            if (dRes.ok) setDependents(await dRes.json());

        } catch (err) {
            console.error("Failed to load profile", err);
            showToast("Failed to load profile details.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const showToast = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const getAvatarUrl = (url) => {
        if (!url) return null;
        let finalUrl = url;
        if (!url.startsWith("http")) {
            finalUrl = `${apiBase}${url}`;
        }
        return `${finalUrl}?t=${avatarTs}`;
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const token = localStorage.getItem(TOKEN_KEY);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${apiBase}/api/v1/profiles/avatar`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setAvatarTs(Date.now()); // Force refresh
                showToast("Profile picture updated!");
                if (onProfileUpdate) onProfileUpdate();
            } else {
                showToast("Failed to upload image.", "error");
            }
        } catch (err) {
            showToast("Error uploading image.", "error");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const token = localStorage.getItem(TOKEN_KEY);

        try {
            const res = await fetch(`${apiBase}/api/v1/profiles/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(profile)
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                showToast("Changes saved successfully!");
                if (onProfileUpdate) onProfileUpdate();
            } else {
                showToast("Failed to save changes.", "error");
            }
        } catch (err) {
            showToast("Error saving changes.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-center-full">
                <style>{`
                    .flex-center-full { display: flex; justify-content: center; align-items: center; height: 400px; color: #718096; }
                `}</style>
                Loading profile...
            </div>
        );
    }

    return (
        <div className="profile-embedded">
            <style>{`
                .profile-embedded { display: flex; font-family: 'Inter', sans-serif; gap: 32px; align-items: flex-start; }
                .profile-nav { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; }
                .nav-btn { text-align: left; padding: 10px 16px; border-radius: 8px; border: none; background: transparent; color: #4a5568; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; alignItems: center; gap: 10px; }
                .nav-btn:hover { background: #f7fafc; color: #2b6cb0; }
                .nav-btn.active { background: #ebf8ff; color: #2b6cb0; font-weight: 600; }
                
                .profile-content { flex: 1; max-width: 800px; }
                .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); padding: 32px; border: 1px solid #e2e8f0; }
                
                .section-title { font-size: 24px; font-weight: 700; color: #2d3748; margin-bottom: 8px; }
                .section-desc { color: #718096; margin-bottom: 32px; font-size: 14px; }

                .avatar-upload { position: relative; width: 100px; height: 100px; margin-bottom: 24px; cursor: pointer; }
                .avatar-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #4299e1, #667eea); display: flex; alignItems: center; justifyContent: center; color: white; font-size: 32px; font-weight: bold; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .upload-icon { position: absolute; bottom: 0; right: 0; background: #2d3748; color: white; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s; }
                .avatar-upload:hover .upload-icon { transform: scale(1.1); }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
                .form-group { margin-bottom: 20px; }
                .form-group.full { grid-column: span 2; }
                .label { display: block; font-size: 13px; font-weight: 600; color: #4a5568; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
                .input { width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid #cbd5e0; font-size: 15px; transition: border-color 0.2s; background: #fff; color: #2d3748; }
                .input:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1); }
                .textarea { min-height: 100px; resize: vertical; }

                .btn-primary { background: #3182ce; color: white; padding: 10px 24px; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
                .btn-primary:hover { background: #2b6cb0; }
                .btn-danger { color: #e53e3e; background: #fff5f5; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
                .btn-danger:hover { background: #fed7d7; }

                .toast { position: fixed; bottom: 32px; right: 32px; padding: 12px 24px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideUp 0.3s ease-out; z-index: 200; }
                .toast.success { background: #2f855a; color: white; }
                .toast.error { background: #c53030; color: white; }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                .dependent-item { display: flex; justify-content: space-between; alignItems: center; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; background: #f8fafc; }
            `}</style>

            {message.text && <div className={`toast ${message.type}`}>{message.text}</div>}

            <nav className="profile-nav">
                <button className={`nav-btn ${activeSection === "personal" ? "active" : ""}`} onClick={() => setActiveSection("personal")}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Personal Details
                </button>
                <button className={`nav-btn ${activeSection === "education" ? "active" : ""}`} onClick={() => setActiveSection("education")}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                    Education
                </button>
                <button className={`nav-btn ${activeSection === "dependents" ? "active" : ""}`} onClick={() => setActiveSection("dependents")}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Dependents
                </button>
            </nav>

            <div className="profile-content">
                {activeSection === "personal" && (
                    <>
                        <h2 className="section-title">Personal Details</h2>
                        <p className="section-desc">Manage your public profile and private information.</p>

                        <div className="card">
                            <form onSubmit={handleSave}>
                                {/* Save Button at Top */}
                                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
                                    <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
                                </div>

                                <div className="avatar-section" style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 40 }}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        hidden
                                        accept="image/*"
                                    />
                                    <div className="avatar-upload" onClick={() => fileInputRef.current.click()}>
                                        {profile?.profile_picture_url ? (
                                            <img src={getAvatarUrl(profile.profile_picture_url)} className="avatar-img" alt="Profile" />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {(profile?.first_name?.[0] || "U").toUpperCase()}
                                            </div>
                                        )}
                                        <div className="upload-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2d3748", marginBottom: 4 }}>Profile Picture</h3>
                                        <p style={{ color: "#718096", fontSize: 14 }}>Click to upload a new avatar. JPG, PNG or GIF.</p>
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="label">First Name</label>
                                        <input className="input" type="text" value={profile?.first_name || ""} onChange={e => setProfile({ ...profile, first_name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Last Name</label>
                                        <input className="input" type="text" value={profile?.last_name || ""} onChange={e => setProfile({ ...profile, last_name: e.target.value })} />
                                    </div>
                                    <div className="form-group full">
                                        <label className="label">Bio</label>
                                        <textarea className="input textarea" value={profile?.bio || ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us a bit about yourself..."></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Phone Number</label>
                                        <input className="input" type="tel" value={profile?.phone_number || ""} onChange={e => setProfile({ ...profile, phone_number: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Date of Birth</label>
                                        <input className="input" type="date" value={profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : ""} onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })} />
                                    </div>
                                </div>

                                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2d3748", marginBottom: 16, marginTop: 40, borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>Address & Location</h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                    <div className="form-group">
                                        <label className="label">Address Line 1</label>
                                        <input className="input" type="text" value={profile?.address_line1 || ""} onChange={e => setProfile({ ...profile, address_line1: e.target.value })} placeholder="Street address, P.O. box" />
                                    </div>

                                    <div className="form-group">
                                        <label className="label">Address Line 2 (Optional)</label>
                                        <input className="input" type="text" value={profile?.address_line2 || ""} onChange={e => setProfile({ ...profile, address_line2: e.target.value })} placeholder="Apartment, suite, unit, building, floor, etc." />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                        <div className="form-group">
                                            <label className="label">Country</label>
                                            <select className="input" value={profile?.country_id || ""} onChange={e => setProfile({ ...profile, country_id: e.target.value ? parseInt(e.target.value) : null })}>
                                                <option value="">Select Country</option>
                                                {countries.length > 0 ? (
                                                    countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                                ) : (
                                                    <option disabled>Loading countries...</option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="label">City</label>
                                            <select className="input" value={profile?.city_id || ""} onChange={e => setProfile({ ...profile, city_id: e.target.value ? parseInt(e.target.value) : null })}>
                                                <option value="">Select City</option>
                                                {cities.length > 0 ? (
                                                    cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                                ) : (
                                                    <option disabled>
                                                        {profile?.country_id ? "Loading cities..." : "Select Country First"}
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">Postal Code</label>
                                        <input className="input" style={{ width: "50%" }} type="text" value={profile?.postal_code || ""} onChange={e => setProfile({ ...profile, postal_code: e.target.value })} />
                                    </div>
                                </div>

                                {/* Save Button at Bottom */}
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
                                    <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {activeSection === "education" && (
                    <>
                        <h2 className="section-title">Education</h2>
                        <p className="section-desc">Add your educational background.</p>
                        <div className="card">
                            <form onSubmit={handleSave}>
                                <div className="form-group" style={{ maxWidth: 400 }}>
                                    <label className="label">Highest Education Level</label>
                                    <select className="input" value={profile?.education_level_id || ""} onChange={e => setProfile({ ...profile, education_level_id: e.target.value ? parseInt(e.target.value) : null })}>
                                        <option value="">Select Level</option>
                                        {educationLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
                                    <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {activeSection === "dependents" && (
                    <>
                        <h2 className="section-title">Dependents</h2>
                        <p className="section-desc">Manage family members for benefits.</p>

                        <div className="card">
                            {dependents.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px", color: "#a0aec0", fontStyle: "italic" }}>
                                    No dependents added yet.
                                </div>
                            ) : (
                                <div style={{ marginBottom: 32 }}>
                                    {dependents.map(dep => (
                                        <div key={dep.id} className="dependent-item">
                                            <div>
                                                <div style={{ fontWeight: 600, color: "#2d3748" }}>{dep.name}</div>
                                                <div style={{ fontSize: 13, color: "#718096" }}>{dep.relationship} • {dep.date_of_birth ? new Date(dep.date_of_birth).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                            <button className="btn-danger" onClick={async () => {
                                                if (!confirm("Remove dependent?")) return;
                                                const token = localStorage.getItem(TOKEN_KEY);
                                                await fetch(`${apiBase}/api/v1/profiles/dependents/${dep.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                                setDependents(dependents.filter(d => d.id !== dep.id));
                                            }}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2d3748", marginBottom: 16 }}>Add New Dependent</h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData);
                                if (!data.date_of_birth) delete data.date_of_birth;

                                const token = localStorage.getItem(TOKEN_KEY);
                                const res = await fetch(`${apiBase}/api/v1/profiles/dependents`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify(data)
                                });
                                if (res.ok) {
                                    const newDep = await res.json();
                                    setDependents([...dependents, newDep]);
                                    e.target.reset();
                                    showToast("Dependent added!");
                                }
                            }}>
                                <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr", alignItems: "end" }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input name="name" className="input" placeholder="Full Name" required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input name="relationship" className="input" placeholder="Relationship" required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input name="date_of_birth" type="date" className="input" />
                                    </div>
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <button className="btn-primary" type="submit" style={{ width: "100%" }}>Add Dependent</button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
