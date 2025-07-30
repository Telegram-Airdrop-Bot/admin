import { io } from "socket.io-client";

// Make sure this matches your backend port!
export const socket = io("https://joingroup-8835.onrender.com", {
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

// Socket connection status
let isConnected = false;

// Socket event listeners
socket.on('connect', () => {
  console.log('🔌 Socket connected');
  isConnected = true;
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected');
  isConnected = false;
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
  isConnected = false;
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`🔌 Socket reconnected after ${attemptNumber} attempts`);
  isConnected = true;
});

// Admin socket events and functions
export const adminSocket = {
  // Check if socket is connected
  isConnected: () => isConnected,

  // Join admin room to receive all notifications
  joinAdminRoom: () => {
    if (isConnected) {
      socket.emit('admin_join');
      console.log('👑 Admin joined admin room');
    } else {
      console.log('⚠️ Socket not connected, cannot join admin room');
    }
  },

  // Listen for admin notifications (new messages from users)
  onAdminNotification: (callback) => {
    socket.on('admin_notification', (data) => {
      console.log('📢 Admin notification received:', data);
      callback(data);
    });
  },

  // Listen for new messages in admin dashboard
  onNewMessage: (callback) => {
    socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      callback(data);
    });
  },

  // Send message from admin to user
  sendAdminMessage: (user_id, message) => {
    if (isConnected) {
      socket.emit('admin_message', {
        user_id: user_id,
        message: message,
        sender: 'admin'
      });
      console.log('📤 Admin message sent to user:', user_id);
    } else {
      console.log('⚠️ Socket not connected, cannot send message');
    }
  },

  // Get all recent messages for admin
  getAdminMessages: async () => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/admin/messages');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching admin messages:', error);
      return { status: 'error', messages: [] };
    }
  },

  // Get all users for admin dashboard
  getAdminUsers: async () => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/admin/users');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching admin users:', error);
      return { status: 'error', users: [] };
    }
  },

  // Send message to specific user
  sendMessageToUser: async (user_id, message) => {
    try {
      const response = await fetch(`https://joingroup-8835.onrender.com/send-admin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          message: message
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error sending message to user:', error);
      return { status: 'error', message: error.message };
    }
  },

  // Get messages for specific user
  getUserMessages: async (user_id) => {
    try {
      const response = await fetch(`https://joingroup-8835.onrender.com/chat/${user_id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching user messages:', error);
      return { status: 'error', messages: [] };
    }
  },

  // Send message to all users
  sendMessageToAll: async (message) => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/send_all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `message=${encodeURIComponent(message)}`
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error sending message to all users:', error);
      return { status: 'error', message: error.message };
    }
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/dashboard-stats');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return { status: 'error', stats: {} };
    }
  },

  // Get users for dashboard
  getDashboardUsers: async (page = 1, page_size = 10) => {
    try {
      const response = await fetch(`https://joingroup-8835.onrender.com/dashboard-users?page=${page}&page_size=${page_size}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching dashboard users:', error);
      return { status: 'error', users: [] };
    }
  },

  // Set user label
  setUserLabel: async (user_id, label) => {
    try {
      const response = await fetch(`https://joingroup-8835.onrender.com/user/${user_id}/label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error setting user label:', error);
      return { status: 'error', message: error.message };
    }
  },

  // Add test user
  addTestUser: async (user_id, full_name = 'Test User', username = 'testuser') => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/add-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          full_name: full_name,
          username: username
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error adding test user:', error);
      return { status: 'error', message: error.message };
    }
  },

  // Manual join simulation
  manualJoin: async (user_id, full_name = 'Manual User', username = 'manualuser') => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/manual-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          full_name: full_name,
          username: username
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error manual join:', error);
      return { status: 'error', message: error.message };
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/health');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error health check:', error);
      return { status: 'error', message: error.message };
    }
  },

  // Database status
  getDatabaseStatus: async () => {
    try {
      const response = await fetch('https://joingroup-8835.onrender.com/db-status');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting database status:', error);
      return { status: 'error', message: error.message };
    }
  }
};

// Initialize admin socket connection
export const initializeAdminSocket = () => {
  // Join admin room when component mounts
  adminSocket.joinAdminRoom();

  // Set up admin notification listener
  adminSocket.onAdminNotification((data) => {
    console.log('📢 New user message:', data);
    // You can dispatch this to your state management system
    // For example: dispatch(newUserMessage(data));
  });

  // Set up new message listener
  adminSocket.onNewMessage((data) => {
    console.log('📨 New message in admin dashboard:', data);
    // You can dispatch this to your state management system
    // For example: dispatch(newMessage(data));
  });

  console.log('🔌 Admin socket initialized');
};

// Export default socket for backward compatibility
export default socket;
