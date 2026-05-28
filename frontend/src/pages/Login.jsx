import { LockKeyhole, LogIn } from "lucide-react";
import { useState } from "react";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "password123$";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setError("Invalid email or password.");
      return;
    }

    localStorage.setItem("aldricAuthenticated", "true");
    onLogin();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950/85 p-6 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
            <LockKeyhole size={22} />
          </div>
          <div>
            <p className="metric-label">Secure Access</p>
            <h1 className="text-2xl font-semibold text-white">Aldric Login</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="metric-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="control-input mt-2 w-full"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="metric-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="control-input mt-2 w-full"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            <LogIn size={17} />
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
