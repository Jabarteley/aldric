import { useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem("aldricAuthenticated") === "true");

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return <Dashboard onLogout={() => setAuthenticated(false)} />;
}
