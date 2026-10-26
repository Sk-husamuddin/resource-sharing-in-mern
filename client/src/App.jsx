import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ResourceList from './pages/ResourceList';
import ResourceDetail from './pages/ResourceDetail';
import ResourceForm from './pages/ResourceForm';
import ContactOwner from './pages/ContactOwner';
import LostFound from './pages/LostFound';
import LostFoundDetail from './pages/LostFoundDetail';
import LostFoundForm from './pages/LostFoundForm';
import ClaimItem from './pages/ClaimItem';
import Claims from './pages/Claims';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Authenticated Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Resources Routes */}
      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <ResourceList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/study-materials"
        element={
          <ProtectedRoute>
            <ResourceList categoryProp="study-materials" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/books-notes"
        element={
          <ProtectedRoute>
            <ResourceList categoryProp="books-notes" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/tools-equipment"
        element={
          <ProtectedRoute>
            <ResourceList categoryProp="tools-equipment" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/new"
        element={
          <ProtectedRoute>
            <ResourceForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/:id"
        element={
          <ProtectedRoute>
            <ResourceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/:id/edit"
        element={
          <ProtectedRoute>
            <ResourceForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/:id/contact"
        element={
          <ProtectedRoute>
            <ContactOwner />
          </ProtectedRoute>
        }
      />

      {/* Lost & Found Routes */}
      <Route
        path="/lost-found"
        element={
          <ProtectedRoute>
            <LostFound />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-found/new"
        element={
          <ProtectedRoute>
            <LostFoundForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-found/:id"
        element={
          <ProtectedRoute>
            <LostFoundDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-found/:id/edit"
        element={
          <ProtectedRoute>
            <LostFoundForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-found/:id/claim"
        element={
          <ProtectedRoute>
            <ClaimItem />
          </ProtectedRoute>
        }
      />

      {/* Claims, Messages & Profile */}
      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            <Claims />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
