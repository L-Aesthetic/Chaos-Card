// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChaosApp from "./ChaosApp";
import AdminApp from "./admin/AdminApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Chaos/Bingo app */}
        <Route path="/" element={<ChaosApp />} />

        {/* Admin section */}
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
