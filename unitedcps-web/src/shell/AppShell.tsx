import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/app.css";

import icon from "../assets/logo_Icon_only.png";

type Props = { children: ReactNode };

export default function AppShell({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/dashboard")) return "Dashboard";
    return "UnitedCPS";
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <div className="ucps-app">
      <div className="ucps-shell">
        <aside className="ucps-sidebar">
          <div className="ucps-brandRow">
            <img src={icon} className="ucps-brandLogo" alt="UnitedCPS" />
            <div className="ucps-brandText">
              <div className="ucps-brandTitle">UnitedCPS CRM</div>
              <div className="ucps-brandSub">Operations</div>
            </div>
          </div>

          <nav className="ucps-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/engineers">Engineers</Link>
            <Link to="/clients">Clients</Link>
            <Link to="/certificates">Certificates</Link>
            <Link to="/jobs">Jobs</Link>
            <Link to="/assignments">Assignments</Link>
            <Link to="/time-off">Time off</Link>
            <Link to="/users">Users</Link>
            <Link to="/settings">Settings</Link>
          </nav>
        </aside>

        <main className="ucps-main">
          <header className="ucps-topbar">
            <div className="ucps-topbarLeft">
              <div className="ucps-pageTitle">{pageTitle}</div>
              <div className="ucps-pageHint">Manager portal</div>
            </div>

            <div className="ucps-topbarRight">
              <button
                className="ucps-iconBtn"
                type="button"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>

              <button className="ucps-iconBtn" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </header>

          <section className="ucps-content">{children}</section>
        </main>
      </div>
    </div>
  );
}