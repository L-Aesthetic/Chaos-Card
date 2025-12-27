// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import ChaosApp from "./ChaosApp";
import AdminApp from "./admin/AdminApp";

export default function App() {
  return (
    <Routes>
      {/* Admin section */}
      <Route path="/admin/*" element={<AdminApp />} />

      {/* Everything else */}
      <Route path="/*" element={<ChaosApp />} />
    </Routes>
  );
}
