import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/store';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ParentDashboard from './pages/ParentDashboard';
import NotFound from './pages/NotFound';
import Landing from './pages/Landing';

// Page imports – uncomment as you create the files
import ClassManagement from './pages/ClassManagement';
import UserManagement from './pages/UserManagement';
import AssignmentManagement from './pages/AssignmentManagement';
import GradingPage from './pages/GradingPage';
import StudentAssignments from './pages/StudentAssignments';
import Messages from './pages/Messages';
import NotificationsPage from './pages/NotificationsPage';
import AITools from './pages/AITools';

function AppRoutes() {
  const user = useSelector((state) => state.auth.user);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={!user ? <Landing /> : <Navigate to={`/${user.role.toLowerCase()}`} />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to={`/${user.role.toLowerCase()}`} />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to={`/${user.role.toLowerCase()}`} />} />

          {/* Student Dashboard with nested routes */}
          <Route path="/student/*" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Routes>
                <Route index element={<StudentDashboard />} />
                <Route path="assignments" element={<StudentAssignments />} />
                <Route path="messages" element={<Messages />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="ai-tools" element={<AITools />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Teacher Dashboard with nested routes */}
          <Route path="/teacher/*" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Routes>
                <Route index element={<TeacherDashboard />} />
                <Route path="classes" element={<ClassManagement />} />
                <Route path="assignments" element={<AssignmentManagement />} />
                <Route path="submissions/:assignmentId" element={<GradingPage />} />
                <Route path="messages" element={<Messages />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="ai-tools" element={<AITools />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Admin Dashboard with nested routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="classes" element={<ClassManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="messages" element={<Messages />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="ai-tools" element={<AITools />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Parent Dashboard with nested routes */}
          <Route path="/parent/*" element={
            <ProtectedRoute roles={['PARENT']}>
              <Routes>
                <Route index element={<ParentDashboard />} />
                <Route path="messages" element={<Messages />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}