import React, { useState } from 'react';

export default function Sidebar({ users, onChat }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h4>Users</h4>
        <input
          className="form-control"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="user-list">
        {filtered.map(user => (
          <div className="user-list-item" key={user.user_id}>
            <div>
              <span className="user-avatar">{(user.full_name || 'U')[0]}</span>
              <span className="user-name">{user.full_name || 'User'}</span>
              <span className="user-username">{user.username ? `@${user.username}` : ''}</span>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => onChat(user)}>
              <i className="bi bi-chat-dots"></i> Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
