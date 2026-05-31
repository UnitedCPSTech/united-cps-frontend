import React from "react";
import "../styles/auth.css";

import logo from "../assets/logo.png";
import pattern from "../assets/ucps_background_pattern.svg";
import hero from "../assets/ucps_hero_background.svg";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="ucps-auth">
      <div className="ucps-auth__bg" aria-hidden="true">
        <div
          className="ucps-auth__pattern"
          style={{ backgroundImage: `url(${pattern})` }}
        />
        <div
          className="ucps-auth__hero"
          style={{ backgroundImage: `url(${hero})` }}
        />
      </div>

      <div className="ucps-auth__wrap">
        <div className="ucps-auth__brand">
          <img className="ucps-auth__logo" src={logo} alt="UnitedCPS" />
          <h1 className="ucps-auth__headline">UnitedCPS CRM</h1>
          <p className="ucps-auth__sub">
            Manage engineers, jobs, assignments and time off in one place.
          </p>

          <ul className="ucps-auth__bullets">
            <li>
              <span className="ucps-dot" />
              Fast scheduling and assignment tracking
            </li>
            <li>
              <span className="ucps-dot" />
              Clear availability and time off visibility
            </li>
            <li>
              <span className="ucps-dot" />
              Simple user invites and secure auth
            </li>
          </ul>
        </div>

        <div className="ucps-card">
          <h2 className="ucps-card__title">{title}</h2>
          {subtitle ? <p className="ucps-card__hint">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}