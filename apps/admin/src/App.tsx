import { Route, Routes } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import { ProtectedRoute } from '@/components/protected-route';

function Home() {
  return <div className="p-8 text-2xl font-semibold">Admin</div>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
    </Routes>
  );
}
