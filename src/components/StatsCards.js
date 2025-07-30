import React from 'react';

export default function StatsCards({ stats }) {
  return (
    <div className="stats-cards mb-4">
      <div className="card stat-card">
        <div className="card-body">
          <h6>Total Users</h6>
          <div className="stat-value">{stats.total_users || 0}</div>
        </div>
      </div>
      <div className="card stat-card">
        <div className="card-body">
          <h6>Active Users</h6>
          <div className="stat-value">{stats.active_users || 0}</div>
        </div>
      </div>
      <div className="card stat-card">
        <div className="card-body">
          <h6>Messages Sent</h6>
          <div className="stat-value">{stats.messages_sent || 0}</div>
        </div>
      </div>
      <div className="card stat-card">
        <div className="card-body">
          <h6>New Joins Today</h6>
          <div className="stat-value">{stats.new_joins_today || 0}</div>
        </div>
      </div>
    </div>
  );
}
