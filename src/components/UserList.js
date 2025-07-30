import React from 'react';

export default function UserList({ users, onChat }) {
  return (
    <div className="list-group">
      {users.map(user => (
        <button
          key={user.user_id}
          className="list-group-item list-group-item-action"
          onClick={() => onChat(user)}
        >
          {user.full_name || 'User'} {user.username ? `(@${user.username})` : ''}
        </button>
      ))}
    </div>
  );
}
