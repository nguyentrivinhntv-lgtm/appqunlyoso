import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import FormGenerator from './pages/FormGenerator';
import Statistics from './pages/Statistics';
import ProcessedProfiles from './pages/ProcessedProfiles';
import PrintQueue from './pages/PrintQueue';
import DocumentDistribution from './pages/DocumentDistribution';
import ConnectionSettings from './pages/ConnectionSettings';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import StudentLookup from './pages/StudentLookup';
import { getCurrentUser, isAdmin } from './services/auth';
import ErrorBoundary from './components/ErrorBoundary';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin Only Route Wrapper
const AdminRoute = ({ children }) => {
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
    <HashRouter>
      <Toaster position="top-center" containerClassName="hide-on-print" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<ConnectionSettings />} />
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/forms" element={<FormGenerator />} />
          <Route path="/print-queue" element={<PrintQueue />} />
          <Route path="/processed" element={<ProcessedProfiles />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/student-lookup" element={<StudentLookup />} />
          <Route path="/distribution" element={<DocumentDistribution />} />
          <Route path="/settings" element={<AdminRoute><ConnectionSettings /></AdminRoute>} />
          <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
