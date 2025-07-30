import React, { useState } from 'react';

export default function Broadcast({ onClose }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const send = (e) => {
    e.preventDefault();
    fetch('http://localhost:5001/send_all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `message=${encodeURIComponent(message)}`
    }).then(res => res.json()).then(data => {
      setStatus(data.status || 'Sent!');
      setMessage('');
    });
  };
  return (
    <div className="broadcast-modal">
      <div className="broadcast-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h5>Broadcast Message</h5>
        <form onSubmit={send}>
          <textarea
            className="form-control mb-2"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message to all users..."
            required
          />
          <button className="btn btn-success" type="submit">Send</button>
        </form>
        {status && <div className="alert alert-info mt-2">{status}</div>}
      </div>
    </div>
  );
}
