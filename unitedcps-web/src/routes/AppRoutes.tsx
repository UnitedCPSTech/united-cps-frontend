import { Routes, Route, Navigate } from "react-router-dom";

import SignIn from "../pages/SignIn";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import AcceptInvite from "../pages/AcceptInvite";
import EngineerRedirect from "../pages/EngineerRedirect";

import ProtectedRoute from "./ProtectedRoute";
import AppShell from "../shell/AppShell";
import Dashboard from "../pages/Dashboard";
import Engineers from "../pages/Engineers";
import Jobs from "../pages/Jobs";
import Assignments from "../pages/Assignments";
import TimeOff from "../pages/TimeOff";
import Users from "../pages/Users";
import Settings from "../pages/Settings";
import SetJobDates from "../pages/SetJobDates";
import JobsList from "../pages/JobsList";


import CreateJob from "../pages/CreateJob";
import EditJob from "../pages/EditJob";
import AssignEngineer from "../pages/AssignEngineer";
import CreateEngineer from "../pages/CreateEngineer";

import Clients from "../pages/Clients";
import CreateClient from "../pages/CreateClient";

import Certificates from "../pages/Certificates";
import CreateCertificate from "../pages/CreateCertificate";

import CreateManager from "../pages/CreateManager";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public auth pages */}
      <Route path="/" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/engineer-redirect" element={<EngineerRedirect />} />

      {/* Manager-only CRM */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/engineers"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Engineers />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jobs"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Jobs />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Assignments />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/time-off"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <TimeOff />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Users />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Settings />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jobs/create"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <CreateJob />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jobs/:jobId/dates"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <SetJobDates />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jobs/list"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <JobsList />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jobs/:jobId/edit"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <EditJob />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jobs/:jobId/assign"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <AssignEngineer />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/engineers/create"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <CreateEngineer />
            </AppShell>
          </ProtectedRoute>
        }
      />


      <Route
        path="/clients"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Clients />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients/create"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <CreateClient />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/certificates"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <Certificates />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/certificates/create"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <CreateCertificate />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/create"
        element={
          <ProtectedRoute allowRoles={["GENERAL_MANAGER", "OPS_MANAGER"]}>
            <AppShell>
              <CreateManager />
            </AppShell>
          </ProtectedRoute>
        }
      />
















      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}