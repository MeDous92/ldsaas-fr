import { useState, useMemo } from "react";
import EmployeeFeed from "./EmployeeFeed";
import ManagerDashboard from "./ManagerDashboard";
import InvitePage from "./InvitePage";

const apiBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ldsaas_access_token";

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

export default function App() {
  const path = window.location.pathname;
  const isLogin = path === "/login";
  const isInvite = path === "/accept-invite";
  const isEmployee = path === "/employee" || path === "/home";
  const isManager = path === "/manager";
  const isAdmin = path === "/admin";
  const isInvitePage = path === "/invite";
  const isDefault = !isLogin && !isInvite && !isEmployee && !isManager && !isAdmin && !isInvitePage;

  return (
    <main className={`page ${isEmployee ? "page--employee" : ""}`}>
      {(isInvite || isDefault) && <InviteCard />}
      {isLogin && <LoginCard />}
      {isEmployee && <EmployeeFeed />}
      {(isManager || isAdmin) && (
        <ManagerDashboard />
      )}
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
    if (!apiBase) list.push("backend url");
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
    <section className="card">
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

  const canSubmit = !!apiBase && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setData(null);

    console.log("[Login Debug] Starting login process...");
    console.log("[Login Debug] API Base:", apiBase);

    if (!apiBase) {
      const msg = "Missing: backend url (check .env VITE_BACKEND_URL)";
      console.error("[Login Debug]", msg);
      setError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);

      console.log("[Login Debug] Request Body (params):", body.toString());

      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });

      console.log("[Login Debug] Response Status:", res.status);

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const text = await res.text();
          console.log("[Login Debug] Error Body (text):", text);
          try {
            const payload = JSON.parse(text);
            if (payload && payload.detail) {
              message = typeof payload.detail === "string"
                ? payload.detail
                : JSON.stringify(payload.detail);
            }
          } catch (e) {
            // Not JSON, use text if available or default message
            if (text) message = `Error: ${text.slice(0, 100)}`;
          }
        } catch (_) {
          console.error("[Login Debug] Failed to read error body");
        }
        throw new Error(message);
      }

      const payload = await res.json();
      console.log("[Login Debug] Success Payload:", payload);

      setData(payload);
      if (payload?.access_token) {
        localStorage.setItem(TOKEN_KEY, payload.access_token);
      }
      if (payload?.user) {
        // Store user info for personalization
        const name = payload.user.name || payload.user.email || "User";
        localStorage.setItem("ldsaas_user_name", name);

        if (payload.user.role) {
          const role = payload.user.role.toLowerCase();
          if (role === "employee") {
            window.location.assign("/home");
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
    <section className="card">
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

        {data && (
          <div className="token">
            <div className="token-label">Access Token</div>
            <textarea readOnly value={data.access_token || ""} />
          </div>
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

function RoleCard({ role, message }) {
  return (
    <section className="card">
      <div className="card-header">
        <p className="eyebrow">{role}</p>
        <h1>{role} Portal</h1>
        <p className="subhead">{message}</p>
      </div>
      <div className="placeholder">
        This is a placeholder page for the {role.toLowerCase()} role.
      </div>
      <a className="link" href="/login">
        Back to login
      </a>
    </section>
  );
}
