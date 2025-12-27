// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChaosApp from "./ChaosApp";
import AdminApp from "./admin/AdminApp";
import Landing from "./Landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/landing" element={<Landing />} />

        {/* Main app */}
        <Route path="/" element={<ChaosApp />} />

        {/* Admin */}
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
