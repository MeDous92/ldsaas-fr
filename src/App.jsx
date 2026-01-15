import { useState, useMemo, useEffect, useRef } from "react";
import EmployeeDashboard from "./EmployeeDashboard";
import ManagerDashboard from "./ManagerDashboard";
import InvitePage from "./InvitePage";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

// Interactive Mouse Background Component
function InteractiveBackground() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    function handleMouseMove(e) {
      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="interactive-bg">
      <div className="starfield"></div>
      <div ref={spotlightRef} className="mouse-spotlight"></div>
    </div>
  );
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

export default function App() {
  const path = window.location.pathname;
  const isLogin = path === "/login";
  const isInvite = path === "/accept-invite";
  const isInvitePage = path === "/invite";

  // Strict Routes
  const isEmployee = path === "/employee";
  const isManager = path === "/manager" || path === "/admin";

  // Auth Check Effect
  useEffect(() => {
    // Redirect /home or root to proper dashboard if logged in
    if (path === "/" || path === "/home") {
      const role = localStorage.getItem("ldsaas_user_role");
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && role) {
        window.location.replace(role === "manager" || role === "admin" ? "/manager" : "/employee");
      } else if (token) {
        // Fallback if role missing but token exists (legacy login)
        fetch(`${apiBase}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(u => {
            localStorage.setItem("ldsaas_user_role", u.role.toLowerCase());
            window.location.replace(u.role === "manager" || u.role === "admin" ? "/manager" : "/employee");
          }).catch(() => window.location.assign("/login"));
      } else {
        window.location.replace("/login");
      }
    }

    // RBAC Enforcer
    const role = localStorage.getItem("ldsaas_user_role");
    const token = localStorage.getItem(TOKEN_KEY);

    if ((isEmployee || isManager) && !token) {
      window.location.assign("/login");
      return;
    }

    if (token && role) {
      if (isEmployee && (role === 'manager' || role === 'admin')) {
        // Manager on employee route -> Redirect to Manager Dashboard
        window.location.replace("/manager");
      }
      if (isManager && role === 'employee') {
        // Employee on manager route -> Redirect to Employee Dashboard
        window.location.replace("/employee");
      }
    }
  }, [path, isEmployee, isManager]);

  const isDefault = !isLogin && !isInvite && !isEmployee && !isManager && !isInvitePage;

  // Render Background only for public pages
  const showBackground = isLogin || isInvite || isDefault;

  return (
    <main className={`page ${!showBackground ? "page--employee" : ""}`}>
      {showBackground && <InteractiveBackground />}

      {(isInvite || isDefault) && (
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 className="glow-text">Welcome to the world of Opportunities!</h1>
          <InviteCard />
        </div>
      )}

      {isLogin && (
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 className="glow-text">Welcome to the world of Opportunities!</h1>
          <LoginCard />
        </div>
      )}

      {isEmployee && <EmployeeDashboard />}
      {isManager && <ManagerDashboard />}
      {isInvitePage && <InvitePage />}
    </main>
  );
}

function InviteCard() {
  const email = getParam("email");
  const token = getParam("token");
  const invitedName = getParam("name");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const missing = useMemo(() => {
    const list = [];
    if (!email) list.push("email");
    if (!token) list.push("token");
    return list;
  }, [email, token]);

  const canSubmit = missing.length === 0 && !success && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (missing.length > 0) {
      setError(`Missing: ${missing.join(", ")}`);
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError("Password must be 8-72 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password })
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          if (data && data.detail) message = data.detail;
        } catch (_) { }
        throw new Error(message);
      }

      setSuccess(true);
    } catch (err) {
      setError(err && err.message ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-panel">
      <div className="card-header">
        <p className="eyebrow">Invitation</p>
        <h1>Activate your account</h1>
        <p className="subhead">Set a password to complete registration.</p>
      </div>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={invitedName}
            placeholder="Not provided"
            readOnly
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} readOnly />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={72}
            disabled={!canSubmit}
            required
          />
        </label>

        <label className="field">
          <span>Confirm Password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            maxLength={72}
            disabled={!canSubmit}
            required
          />
        </label>

        {missing.length > 0 && (
          <div className="notice error">Missing: {missing.join(", ")}</div>
        )}

        {error && <div className="notice error">{error}</div>}
        {success && (
          <div className="notice success">
            Account activated. You can log in now.
          </div>
        )}

        <button className="primary" type="submit" disabled={!canSubmit}>
          {submitting ? "Submitting..." : "Accept Invite"}
        </button>
        <a className="link" href="/login">
          Go to login
        </a>
      </form>
    </section>
  );
}

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const canSubmit = !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setData(null);

    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);

      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const text = await res.text();
          try {
            const payload = JSON.parse(text);
            if (payload && payload.detail) {
              message = typeof payload.detail === "string"
                ? payload.detail
                : JSON.stringify(payload.detail);
            }
          } catch (e) {
            if (text) message = `Error: ${text.slice(0, 100)}`;
          }
        } catch (_) { }
        throw new Error(message);
      }

      const payload = await res.json();
      setData(payload);
      if (payload?.access_token) {
        localStorage.setItem(TOKEN_KEY, payload.access_token);
      }
      if (payload?.user) {
        const name = payload.user.name || payload.user.email || "User";
        localStorage.setItem("ldsaas_user_name", name);

        if (payload.user.role) {
          const role = payload.user.role.toLowerCase();
          localStorage.setItem("ldsaas_user_role", role);

          if (role === "employee") {
            window.location.assign("/employee");
          } else {
            window.location.assign(`/${role}`);
          }
        }
      }
    } catch (err) {
      console.error("[Login Debug] Exception:", err);
      setError(err && err.message ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-panel">
      <div className="card-header">
        <p className="eyebrow">Login</p>
        <h1>Welcome back</h1>
        <p className="subhead">Sign in to access your account.</p>
      </div>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canSubmit}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!canSubmit}
            required
          />
        </label>

        {error && <div className="notice error">{error}</div>}
        {data && (
          <div className="notice success">Logged in as {data.user?.email}</div>
        )}

        <button className="primary" type="submit" disabled={!canSubmit}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        <a className="link" href="/accept-invite">
          Have an invite? Activate account
        </a>
      </form>
    </section>
  );
}
