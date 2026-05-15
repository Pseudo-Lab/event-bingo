import "./App.css";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import Home from "./modules/Home/Home.tsx";
import BingoGame from "./modules/Bingo/BingoGame.tsx";
import LandingHomePage from "./modules/Landing/LandingHomePage.tsx";
import DemoExperiencePage from "./modules/Landing/DemoExperiencePage.tsx";
import PublicPrivacyPage from "./modules/Landing/PublicPrivacyPage.tsx";
import PublicEventPrivacyPage from "./modules/Landing/PublicEventPrivacyPage.tsx";
import PublicTermsPage from "./modules/Landing/PublicTermsPage.tsx";
import {
  AdminApplicationsPage,
  AdminDashboardPage,
  AdminEventDashboardPage,
  AdminEventOverviewPage,
  AdminEventParticipantsPage,
  AdminEventSettingsPage,
  AdminEventSharePage,
  AdminMembersPage,
  AdminPoliciesPage,
  AdminRoutesLoginPage,
} from "./modules/Admin/AdminPortal";
import { getAdminPath, getEventBingoPath, getEventHomePath } from "./config/eventProfiles";

function AppRoutes() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<LandingHomePage />} />
          <Route path="/event" element={<Navigate to="/" replace />} />
          <Route path="/experience" element={<DemoExperiencePage />} />
          <Route path="/terms" element={<PublicTermsPage />} />
          <Route path="/privacy" element={<PublicPrivacyPage />} />
          <Route path="/bingo" element={<DemoExperiencePage />} />
          <Route path="/admin" element={<AdminRoutesLoginPage />} />
          <Route path="/admin/invite" element={<Navigate to={getAdminPath()} replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/members" element={<AdminMembersPage />} />
          <Route path="/admin/applications" element={<AdminApplicationsPage />} />
          <Route path="/admin/events" element={<AdminEventSettingsPage />} />
          <Route path="/admin/events/:adminEventId" element={<AdminEventOverviewPage />} />
          <Route
            path="/admin/events/:adminEventId/dashboard"
            element={<AdminEventDashboardPage />}
          />
          <Route
            path="/admin/events/:adminEventId/participants"
            element={<AdminEventParticipantsPage />}
          />
          <Route path="/admin/events/:adminEventId/share" element={<AdminEventSharePage />} />
          <Route path="/admin/policies" element={<AdminPoliciesPage />} />
          <Route path="/event/:eventSlug" element={<Home />} />
          <Route path="/event/:eventSlug/privacy" element={<PublicEventPrivacyPage />} />
          <Route path="/event/:eventSlug/bingo" element={<BingoGame />} />
          <Route
            path="/event/:eventSlug/admin"
            element={<Navigate to={getAdminPath()} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/dashboard"
            element={<Navigate to={getAdminPath("dashboard")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/members"
            element={<Navigate to={getAdminPath("members")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/applications"
            element={<Navigate to={getAdminPath("applications")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/event-settings"
            element={<Navigate to={getAdminPath("event-settings")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/event-settings/:adminEventId"
            element={<Navigate to={getAdminPath("event-settings")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/event-settings/:adminEventId/dashboard"
            element={<Navigate to={getAdminPath("event-settings")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/event-settings/:adminEventId/participants"
            element={<Navigate to={getAdminPath("event-settings")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/event-settings/:adminEventId/share"
            element={<Navigate to={getAdminPath("event-settings")} replace />}
          />
          <Route
            path="/event/:eventSlug/admin/policies"
            element={<Navigate to={getAdminPath("policies")} replace />}
          />
          <Route path="/:eventSlug/bingo" element={<LegacyEventBingoRedirect />} />
          <Route path="/:eventSlug" element={<LegacyEventHomeRedirect />} />
        </Routes>
      </main>
    </div>
  );
}

function LegacyEventHomeRedirect() {
  const { eventSlug } = useParams();
  return <Navigate to={getEventHomePath(eventSlug)} replace />;
}

function LegacyEventBingoRedirect() {
  const { eventSlug } = useParams();
  return <Navigate to={getEventBingoPath(eventSlug)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
