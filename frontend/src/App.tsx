import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { HomePage } from "./pages/HomePage";
import { UploadPage } from "./pages/UploadPage";
import { BusinessPanel } from "./pages/results/BusinessPanel";
import { DictionaryPanel } from "./pages/results/DictionaryPanel";
import { FixPackPanel } from "./pages/results/FixPackPanel";
import { ImpactPanel } from "./pages/results/ImpactPanel";
import { IssuesPanel } from "./pages/results/IssuesPanel";
import { ProfilePanel } from "./pages/results/ProfilePanel";
import { ReportPanel } from "./pages/results/ReportPanel";
import { ResultsLayout } from "./pages/results/ResultsLayout";
import { ReconciliationPanel } from "./pages/results/ReconciliationPanel";
import { TrustPanel } from "./pages/results/TrustPanel";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<HomePage />} index />
        <Route element={<UploadPage />} path="upload" />
        <Route element={<ResultsLayout />} path="results">
          <Route element={<Navigate replace to="report" />} index />
          <Route element={<ReportPanel />} path="report" />
          <Route element={<ReconciliationPanel />} path="reconcile" />
          <Route element={<TrustPanel />} path="trust" />
          <Route element={<BusinessPanel />} path="business" />
          <Route element={<ImpactPanel />} path="impact" />
          <Route element={<FixPackPanel />} path="fix-pack" />
          <Route element={<DictionaryPanel />} path="dictionary" />
          <Route element={<ProfilePanel />} path="profile" />
          <Route element={<IssuesPanel />} path="issues" />
        </Route>
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
