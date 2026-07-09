import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

// Pages
import LoginPage from "./pages/Login/LoginPage";
import RegisterPage from "./pages/Register/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPassword/ForgotPasswordPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DoctorListPage from "./pages/DoctorList/DoctorListPage";
import BookAppointmentPage from "./pages/BookAppointment/BookAppointmentPage";
import BookingConfirmationPage from "./pages/BookingConfirmation/BookingConfirmationPage";
import AppointmentListPage from "./pages/AppointmentList/AppointmentListPage";
import AISearchPage from "./pages/AISearch/AISearchPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";

const AppRouter: React.FC = () => (
  <Provider store={store}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/doctors" element={<DoctorListPage />} />
            <Route
              path="/book-appointment/:doctorId"
              element={<BookAppointmentPage />}
            />
            <Route
              path="/booking-confirmation"
              element={<BookingConfirmationPage />}
            />
            <Route path="/appointments" element={<AppointmentListPage />} />
            <Route path="/ai-assistant" element={<AISearchPage />} />
          </Route>

          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </Provider>
);

export default AppRouter;
