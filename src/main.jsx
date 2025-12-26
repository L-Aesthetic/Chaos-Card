import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChaosApp from "./ChaosApp";
import AdminApp from "./admin/AdminApp";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Admin */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Everything else */}
        <Route path="/*" element={<ChaosApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
