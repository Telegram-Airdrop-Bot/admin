import React from 'react';

export default function TopBar({ onBroadcast }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <span className="navbar-brand"><i className="bi bi-robot"></i> Bot Admin Dashboard</span>
        <button className="btn btn-warning" onClick={onBroadcast}>
          <i className="bi bi-megaphone"></i> Broadcast
        </button>
        <span className="ms-auto">
          <img src="https://ui-avatars.com/api/?name=Admin" alt="Admin" className="admin-avatar" />
          <button className="btn btn-outline-light ms-2">Logout</button>
        </span>
      </div>
    </nav>
  );
}
