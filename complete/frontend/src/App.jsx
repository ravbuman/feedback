import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import StudentFeedback from './pages/StudentFeedback';
import StudentFeedbackSubmission from './pages/StudentFeedbackSubmission';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import FacultyManagement from './pages/FacultyManagement';
import CourseManagement from './pages/CourseManagement';
import SubjectManagement from './pages/SubjectManagement';
import AssignFaculty from './pages/AssignFaculty';
import FeedbackFormManagement from './pages/FeedbackFormManagement';
import ResponseAnalytics from './pages/ResponseAnalytics';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import GuestRoute from './components/Auth/GuestRoute';
import Loader from './components/Loader';

function AppContent() {
  const location = useLocation();
  const { loading } = useAuth();
  const isAdminLogin = location.pathname === '/admin/login';

  if (loading) {
    return <Loader />;
  }

  return (
    <div className={`min-h-screen ${!isAdminLogin ? 'bg-gray-50' : ''}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<GuestRoute><Home /></GuestRoute>} />
        <Route path="/feedback/:formId" element={<StudentFeedbackSubmission />} />
        <Route path="/admin/login" element={<GuestRoute><AdminLogin /></GuestRoute>} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/faculty" element={
          <ProtectedRoute>
            <Layout><FacultyManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/courses" element={
          <ProtectedRoute>
            <Layout><CourseManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/subjects" element={
          <ProtectedRoute>
            <Layout><SubjectManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/assign-faculty" element={
          <ProtectedRoute>
            <Layout><AssignFaculty /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/feedback-forms" element={
          <ProtectedRoute>
            <Layout><FeedbackFormManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute>
            <Layout><ResponseAnalytics /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;