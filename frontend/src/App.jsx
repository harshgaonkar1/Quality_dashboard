// ============================================================
// App
// ------------------------------------------------------------
// Top-level route configuration. All pages render inside
// DashboardLayout, which supplies the sidebar and topbar.
// ============================================================

import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ProductReplacement from './pages/ProductReplacement';
import ProductReplacementDetails from './pages/ProductReplacementDetails';
import ProductReplacementShowcase from './pages/ProductReplacementShowcase';
import PartReplacement from './pages/PartReplacement';
import PartReplacementDetails from './pages/PartReplacementDetails';
import PartReplacementShowcase from './pages/PartReplacementShowcase';
import FLAnalyticsDashboard from './pages/FLAnalyticsDashboard';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UploadPage from './pages/UploadPage';

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/product-replacement/showcase" element={<ProductReplacementShowcase />} />
        <Route path="/product-replacement" element={<ProductReplacement />} />
        <Route path="/product-replacement/details" element={<ProductReplacementDetails />} />
        <Route path="/" element={<ProductReplacementShowcase />} />
        <Route path="/part-replacement" element={<PartReplacement />} />
        <Route path="/part-replacement/showcase" element={<PartReplacementShowcase />} />
        <Route path="/part-replacement/details" element={<PartReplacementDetails />} />
        <Route path="/part-showcase" element={<PartReplacementShowcase />} />
        {/* <Route path="/fl-analytics" element={<FLAnalyticsDashboard />} /> */}
        <Route path="/fl-part-replacement" element={<FLAnalyticsDashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}


