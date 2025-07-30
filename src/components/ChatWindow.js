import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { FaPaperPlane } from 'react-icons/fa';

export default function ChatWindow({ user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null); // <-- add file state
  const chatBodyRef = useRef();

  useEffect(() => {
    socket.emit('join', { room: 'chat_' + user.user_id });
    fetch(`http://localhost:5001/chat/${user.user_id}/messages`)
      .then(res => res.text())
      .then(html => setMessages([{ html }]));
    const handler = (data) => {
      if (data.user_id === user.user_id) {
        fetch(`http://localhost:5001/chat/${user.user_id}/messages`)
          .then(res => res.text())
          .then(html => setMessages([{ html }]));
      }
    };
    socket.on('new_message', handler);
    return () => {
      socket.off('new_message', handler);
    };
  }, [user.user_id]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() && !file) return;
    const formData = new window.FormData();
    if (input.trim()) formData.append('message', input);
    if (file) formData.append('file', file);
    fetch(`http://localhost:5001/chat/${user.user_id}`, {
      method: 'POST',
      body: formData
    }).then(() => {
      setInput('');
      setFile(null);
      // reset file input value
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const fileInputRef = useRef();

  return (
    <div className="chat-popup messenger-style">
      <div className="chat-popup-header">
        <span className="user-avatar">{(user.full_name || 'U')[0]}</span>
        <span style={{ fontWeight: 600 }}>{user.full_name || 'User'} {user.username ? `(@${user.username})` : ''}</span>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="chat-popup-body" ref={chatBodyRef}>
        {messages.map((msg, i) => (
          <div key={msg.html + '-' + i} dangerouslySetInnerHTML={{ __html: msg.html }} />
        ))}
      </div>
      <form className="chat-popup-footer" onSubmit={sendMessage} encType="multipart/form-data">
        <input
          type="file"
          accept="image/*,video/*"
          ref={fileInputRef}
          onChange={e => setFile(e.target.files[0])}
          style={{ marginRight: 8, display: 'inline-block' }}
        />
        <input
          type="text"
          className="form-control"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your reply as the assistant..."
          required={!file}
          style={{ borderRadius: 18, marginRight: 8 }}
        />
        <button className="btn btn-primary send-btn" type="submit">
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
}
