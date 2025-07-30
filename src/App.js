import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, CssBaseline, Box, Button, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination, Tooltip, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Avatar, Container, Chip, Select, MenuItem, ThemeProvider, createTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GroupIcon from '@mui/icons-material/Group';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LogoutIcon from '@mui/icons-material/Logout';
import CampaignIcon from '@mui/icons-material/Campaign';
import LinkIcon from '@mui/icons-material/Link';
import ChatWindow from './ChatWindow';
import { io } from 'socket.io-client';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import config from './config';

const drawerWidth = 240;

function App() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  // Broadcast
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  // Direct Message
  const [directMsgUser, setDirectMsgUser] = useState(null);
  const [directMsg, setDirectMsg] = useState('');
  const [directMsgStatus, setDirectMsgStatus] = useState('');
  // Chat
  const [chatUser, setChatUser] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [openChats, setOpenChats] = useState([]); // [{user, minimized, messages, chatInput}]
  const audio = React.useRef(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [joinDateFilter, setJoinDateFilter] = useState(null);
  const [joinDatePickerOpen, setJoinDatePickerOpen] = useState(false);
  const filteredSidebarUsers = users.filter(u => {
    const q = sidebarSearch.toLowerCase();
    if (joinDateFilter) {
      return u.join_date && u.join_date.slice(0, 10) === dayjs(joinDateFilter).format('YYYY-MM-DD');
    }
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });
  const filteredUsers = users.filter(u => {
    if (joinDateFilter) {
      return u.join_date && u.join_date.slice(0, 10) === dayjs(joinDateFilter).format('YYYY-MM-DD');
    }
    return true;
  });
  const calendarIconRef = useRef(null);
  const [mode, setMode] = useState('light');
  const theme = React.useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#90caf9' : '#1976d2' },
      background: {
        default: mode === 'dark' ? '#181a1b' : '#f7f9fb',
        paper: mode === 'dark' ? '#23272b' : '#fff',
      },
    },
  }), [mode]);

  useEffect(() => {
    fetch(`${config.apiUrl}/dashboard-users?page=${page}&page_size=${pageSize}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setTotal(data.total || 0);
      });
    fetch(`${config.apiUrl}/dashboard-stats`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data));
  }, [page, pageSize]);

  // Socket.IO for real-time
  useEffect(() => {
    const socket = io(config.socketUrl);
    socket.on('new_message', (data) => {
      // Find user
      const user = users.find(u => u.user_id === data.user_id);
      if (!user) return;
      // Play sound
      if (audio.current) audio.current.play();
      // Open chat window or bring to front
      setOpenChats(prev => {
        const exists = prev.find(c => c.user.user_id === user.user_id);
        if (exists) {
          // Fetch latest messages for this user
          fetch(`${config.apiUrl}/chat/${user.user_id}/messages`, { credentials: 'include' })
            .then(res => res.json ? res.json() : res.text())
            .then(data => {
              let msgs = [];
              if (Array.isArray(data)) {
                msgs = data.map(([sender, message, timestamp]) => ({ sender, message, timestamp }));
              } else if (typeof data === 'string') {
                msgs = [{ sender: 'system', message: data }];
              }
              setOpenChats(prev2 => prev2.map(c2 => c2.user.user_id === user.user_id ? { ...c2, messages: msgs } : c2));
            });
          return prev;
        }
        // If not open, open and fetch messages
        fetch(`${config.apiUrl}/chat/${user.user_id}/messages`, { credentials: 'include' })
          .then(res => res.json ? res.json() : res.text())
          .then(data => {
            let msgs = [];
            if (Array.isArray(data)) {
              msgs = data.map(([sender, message, timestamp]) => ({ sender, message, timestamp }));
            } else if (typeof data === 'string') {
              msgs = [{ sender: 'system', message: data }];
            }
            setOpenChats(prev2 => [...prev2, { user, minimized: false, messages: msgs, chatInput: '' }]);
          });
        return prev;
      });
    });
    return () => socket.disconnect();
  }, [users]);

  // Function to open chat manually (from sidebar/table)
  const handleOpenChat = (user) => {
    // Remove any existing chat window for this user (if present)
    setOpenChats(prev => prev.filter(c => c.user.user_id !== user.user_id));
    // Add a new chat window for this user (will be empty initially)
    setOpenChats(prev => [...prev, { user, minimized: false, messages: [], chatInput: '' }]);
    // Always fetch latest messages when opening chat
    fetch(`${config.apiUrl}/chat/${user.user_id}/messages`, { credentials: 'include' })
      .then(res => res.json ? res.json() : res.text())
      .then(data => {
        let msgs = [];
        if (Array.isArray(data)) {
          msgs = data.map(([sender, message, timestamp]) => ({ sender, message, timestamp }));
        } else if (typeof data === 'string') {
          msgs = [{ sender: 'system', message: data }];
        }
        setOpenChats(prev => prev.map(c => c.user.user_id === user.user_id ? { ...c, messages: msgs } : c));
      });
  };

  // Fetch messages when chat window opens
  useEffect(() => {
    openChats.forEach((chat, idx) => {
      if (chat.messages.length === 0) {
        fetch(`${config.apiUrl}/chat/${chat.user.user_id}/messages`, { credentials: 'include' })
          .then(res => res.json ? res.json() : res.text())
          .then(data => {
            // Assume data is array of [sender, message, timestamp]
            let msgs = [];
            if (Array.isArray(data)) {
              msgs = data.map(([sender, message, timestamp]) => ({ sender, message, timestamp }));
            } else if (typeof data === 'string') {
              msgs = [{ sender: 'system', message: data }];
            }
            setOpenChats(prev => prev.map((c, i) => i === idx ? { ...c, messages: msgs } : c));
          });
      }
    });
  }, [openChats]);

  // Replace handleSendChat with multiple file support
  const handleSendChat = async (user_id, files, callback) => {
    const chat = openChats.find(c => c.user.user_id === user_id);
    if (!chat) return;
    
    if (!chat.chatInput.trim() && (!files || files.length === 0)) return;
    
    const formData = new FormData();
    if (chat.chatInput.trim()) formData.append('message', chat.chatInput);
    if (files && files.length > 0) {
      files.forEach(f => formData.append('files', f));
    }
    
    // Add typing indicator
    const newMessages = [];
    if (chat.chatInput.trim()) {
      newMessages.push({ sender: 'admin', message: chat.chatInput, timestamp: new Date().toISOString() });
    }
    
    setOpenChats(prev => prev.map(c => c.user.user_id === user_id ? { ...c, messages: [...c.messages, ...newMessages], chatInput: '' } : c));
    
    try {
      const response = await fetch(`${config.apiUrl}/chat/${user_id}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      if (callback) callback();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the message that failed to send
      setOpenChats(prev => prev.map(c => c.user.user_id === user_id ? { ...c, messages: c.messages.slice(0, -newMessages.length) } : c));
      throw error;
    }
  };

  // Minimize/close chat
  const handleMinimizeChat = (user_id) => setOpenChats(prev => prev.map(c => c.user.user_id === user_id ? { ...c, minimized: !c.minimized } : c));
  const handleCloseChat = (user_id) => setOpenChats(prev => prev.filter(c => c.user.user_id !== user_id));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchInviteLink = async () => {
    setInviteLoading(true);
    setInviteError('');
    setInviteLink('');
    try {
      const res = await fetch(`${config.apiUrl}/get_channel_invite_link`);
      const data = await res.json();
      if (data.invite_link) {
        setInviteLink(data.invite_link);
      } else {
        setInviteError(data.error || 'Failed to fetch invite link');
      }
    } catch (err) {
      setInviteError('Failed to fetch invite link');
    }
    setInviteLoading(false);
  };

  // Broadcast
  const handleBroadcastSend = () => {
    fetch(`${config.apiUrl}/send_all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `message=${encodeURIComponent(broadcastMsg)}`
    })
      .then(res => res.json())
      .then(() => setBroadcastStatus('Message sent!'));
  };

  // Direct Message
  const handleDirectMsgSend = () => {
    fetch(`${config.apiUrl}/send_one`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${directMsgUser.user_id}&message=${encodeURIComponent(directMsg)}`
    })
      .then(res => res.json())
      .then(() => setDirectMsgStatus('Message sent!'));
  };

  // Chat
  const openChat = (user) => {
    setChatUser(user);
    setChatOpen(true);
    setChatLoading(true);
    fetch(`${config.apiUrl}/chat/${user.user_id}/messages`, { credentials: 'include' })
      .then(res => res.text())
      .then(html => {
        // Parse HTML to plain text for now (or you can render as HTML)
        setChatMessages([{ sender: 'system', message: html }]);
        setChatLoading(false);
      });
  };
  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    
    setChatSending(true);
    fetch(`${config.apiUrl}/chat/${chatUser.user_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `message=${encodeURIComponent(chatInput)}`
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || 'Failed to send message');
          });
        }
        setChatInput('');
        // Refresh chat messages
        return fetch(`${config.apiUrl}/chat/${chatUser.user_id}/messages`, { credentials: 'include' });
      })
      .then(res => res.text())
      .then(html => {
        setChatMessages([{ sender: 'system', message: html }]);
        setChatSending(false);
      })
      .catch(error => {
        console.error('Error sending message:', error);
        setChatSending(false);
        // You might want to show an error message to the user here
      });
  };

  const labelOptions = [
    { value: '', label: 'None' },
    { value: 'Register', label: 'Register' },
    { value: 'Depositor', label: 'Depositor' },
    { value: 'Withdrawal', label: 'Withdrawal' },
    { value: 'VIP', label: 'VIP' },
  ];
  const handleLabelChange = async (user_id, newLabel) => {
    await fetch(`${config.apiUrl}/user/${user_id}/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel })
    });
    setUsers(users => users.map(u => u.user_id === user_id ? { ...u, label: newLabel } : u));
  };

  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <CssBaseline />
        <audio ref={audio} src="/notify.mp3" preload="auto" />
        {/* AppBar */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            {!isDesktop && (
              <IconButton color="inherit" edge="start" onClick={() => setSidebarOpen(true)} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Bot Admin Dashboard
            </Typography>
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Broadcast">
              <IconButton color="inherit" onClick={() => setBroadcastOpen(true)}>
                <CampaignIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton color="inherit">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        {/* Sidebar Drawer */}
        {isDesktop ? (
          <Drawer
            variant="permanent"
            open
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar />
            <Box sx={{ p: 2, pb: 0 }}>
              <TextField
                size="small"
                placeholder="Search users..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                sx={{ mb: 2 }}
              />
            </Box>
            <Box sx={{ overflow: 'auto' }}>
              <List>
                <ListItem>
                  <ListItemIcon><GroupIcon /></ListItemIcon>
                  <ListItemText primary="Users" />
                </ListItem>
                <Divider />
                {filteredSidebarUsers.map((user) => (
                  <ListItem 
                    key={user.user_id} 
                    onClick={() => handleOpenChat(user)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon><ChatIcon /></ListItemIcon>
                    <ListItemText primary={user.full_name || 'User'} secondary={user.username ? `@${user.username}` : ''} />
                    {user.label && <Chip label={user.label} size="small" color={user.label === 'VIP' ? 'secondary' : 'primary'} sx={{ ml: 1 }} />}
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar />
            <Box sx={{ p: 2, pb: 0 }}>
              <TextField
                size="small"
                placeholder="Search users..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                sx={{ mb: 2 }}
              />
            </Box>
            <Box sx={{ overflow: 'auto' }}>
              <List>
                <ListItem>
                  <ListItemIcon><GroupIcon /></ListItemIcon>
                  <ListItemText primary="Users" />
                </ListItem>
                <Divider />
                {filteredSidebarUsers.map((user) => (
                  <ListItem 
                    key={user.user_id} 
                    onClick={() => handleOpenChat(user)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon><ChatIcon /></ListItemIcon>
                    <ListItemText primary={user.full_name || 'User'} secondary={user.username ? `@${user.username}` : ''} />
                    {user.label && <Chip label={user.label} size="small" color={user.label === 'VIP' ? 'secondary' : 'primary'} sx={{ ml: 1 }} />}
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
        )}
        {/* Main Content */}
        <Container maxWidth="lg" sx={{ flex: 1, pt: 10, pb: 4, ...(isDesktop && { ml: `${drawerWidth}px` }) }}>
          {/* Stats Cards */}
          <Box sx={{ width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', bgcolor: 'background.paper', py: 3, mb: 3 }}>
            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2" fontWeight={600}>Total Users</Typography>
                    <Typography variant="h4" fontWeight={700}>{stats.total_users || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2" fontWeight={600}>Active Users</Typography>
                    <Typography variant="h4" fontWeight={700}>{stats.active_users || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2" fontWeight={600}>Messages Sent</Typography>
                    <Typography variant="h4" fontWeight={700}>{stats.total_messages || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2" fontWeight={600}>New Joins Today</Typography>
                    <Typography variant="h4" fontWeight={700}>{stats.new_joins_today || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          {/* Channel Invite Link */}
          <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Channel Invite Link</Typography>
              <Button variant="outlined" startIcon={<LinkIcon />} onClick={fetchInviteLink} disabled={inviteLoading} sx={{ mb: 2 }}>
                {inviteLoading ? 'Fetching...' : 'Get Channel Invite Link'}
              </Button>
              {inviteLink && (
                <Box mt={2}>
                  <a href={inviteLink} target="_blank" rel="noopener noreferrer">{inviteLink}</a>
                </Box>
              )}
              {inviteError && <Typography color="error" mt={2}>{inviteError}</Typography>}
            </CardContent>
          </Card>
          {/* User List Table */}
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>User List</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 480, overflow: 'auto' }}>
                <Table size="medium" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.paper' }}>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>User ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Join Date
                          <Tooltip title="Filter by join date">
                            <IconButton
                              size="small"
                              ref={calendarIconRef}
                              onClick={e => {
                                e.stopPropagation();
                                setJoinDatePickerOpen(true);
                              }}
                            >
                              <CalendarTodayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {joinDateFilter && (
                            <Tooltip title="Clear filter">
                              <IconButton size="small" color="error" onClick={() => setJoinDateFilter(null)}>
                                ×
                              </IconButton>
                            </Tooltip>
                          )}
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              open={joinDatePickerOpen}
                              onOpen={() => setJoinDatePickerOpen(true)}
                              onClose={() => setJoinDatePickerOpen(false)}
                              value={joinDateFilter}
                              onChange={val => { setJoinDateFilter(val); setJoinDatePickerOpen(false); }}
                              slotProps={{
                                textField: { style: { display: 'none' } },
                                popper: { anchorEl: calendarIconRef.current }
                              }}
                            />
                          </LocalizationProvider>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Invite Link</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Chat</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(filteredUsers || []).length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center">No users found.</TableCell></TableRow>
                    ) : (
                      (filteredUsers || []).map((user, idx) => (
                        <TableRow key={user.user_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'background.paper' : 'background.default', transition: 'background 0.2s' }}>
                          <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                          <TableCell>{user.user_id}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {user.photo_url ? (
                                <Avatar src={user.photo_url} alt={user.full_name} sx={{ width: 32, height: 32 }} />
                              ) : (
                                <Avatar sx={{ bgcolor: '#bbb', width: 32, height: 32 }}>
                                  {user.full_name ? user.full_name[0] : 'U'}
                                </Avatar>
                              )}
                              <span>{user.full_name || 'Unknown'}</span>
                              {user.label && <Chip label={user.label} size="small" color={user.label === 'VIP' ? 'secondary' : 'primary'} sx={{ ml: 1 }} />}
                              <Select
                                size="small"
                                value={user.label || ''}
                                onChange={e => handleLabelChange(user.user_id, e.target.value)}
                                sx={{ ml: 1, minWidth: 90 }}
                                displayEmpty
                              >
                                {labelOptions.map(opt => (
                                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                              </Select>
                              {user.is_online && (
                                <Box sx={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  bgcolor: '#4caf50',
                                  display: 'inline-block'
                                }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{user.username ? `@${user.username}` : '-'}</TableCell>
                          <TableCell>{user.join_date}</TableCell>
                          <TableCell>
                            {user.invite_link ? (
                              <>
                                <a href={user.invite_link} target="_blank" rel="noopener noreferrer">Invite Link</a>
                                <Tooltip title="Copy to clipboard">
                                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(user.invite_link)}>
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Chat">
                              <IconButton color="primary" onClick={() => handleOpenChat(user)}>
                                <ChatIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Send Message">
                              <IconButton color="success" onClick={() => setDirectMsgUser(user)}>
                                <SendIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {/* Pagination */}
              <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </CardContent>
          </Card>
          {/* Broadcast Dialog */}
          <Dialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)}>
            <DialogTitle>Broadcast Message</DialogTitle>
            <DialogContent>
              <TextField
                label="Message"
                multiline
                rows={4}
                fullWidth
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
              />
              {broadcastStatus && <Typography color="success.main">{broadcastStatus}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBroadcastOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleBroadcastSend}>Send</Button>
            </DialogActions>
          </Dialog>
          {/* Direct Message Dialog */}
          <Dialog open={!!directMsgUser} onClose={() => setDirectMsgUser(null)}>
            <DialogTitle>Send Message to {directMsgUser?.full_name || 'User'}</DialogTitle>
            <DialogContent>
              <TextField
                label="Message"
                multiline
                rows={4}
                fullWidth
                value={directMsg}
                onChange={e => setDirectMsg(e.target.value)}
              />
              {directMsgStatus && <Typography color="success.main">{directMsgStatus}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDirectMsgUser(null)}>Cancel</Button>
              <Button variant="contained" onClick={handleDirectMsgSend}>Send</Button>
            </DialogActions>
          </Dialog>
          {/* Chat Dialog */}
          <Dialog open={chatOpen} onClose={() => setChatOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Chat with {chatUser?.full_name || 'User'}</DialogTitle>
            <DialogContent dividers sx={{ minHeight: 300 }}>
              {chatLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ maxHeight: 350, overflowY: 'auto', bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                  {/* For demo, just render HTML as plain text. You can improve this to render bubbles. */}
                  <div dangerouslySetInnerHTML={{ __html: chatMessages[0]?.message || '' }} />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <TextField
                size="small"
                placeholder="Type your message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleChatSend(); }}
                sx={{ flex: 1 }}
              />
              <Button variant="contained" onClick={handleChatSend} disabled={chatSending || !chatInput.trim()}>
                Send
              </Button>
            </DialogActions>
          </Dialog>
          {/* Messenger-style Chat Popups */}
          {openChats.map((chat, idx) => (
            <ChatWindow
              key={chat.user.user_id}
              user={{ ...chat.user, index: idx }}
              open={!chat.minimized}
              minimized={chat.minimized}
              onClose={() => handleCloseChat(chat.user.user_id)}
              onMinimize={() => handleMinimizeChat(chat.user.user_id)}
              messages={chat.messages}
              chatInput={chat.chatInput}
              setChatInput={val => setOpenChats(prev => prev.map(c => c.user.user_id === chat.user.user_id ? { ...c, chatInput: val } : c))}
              onSend={(text, files, cb) => handleSendChat(chat.user.user_id, files, cb)}
            />
          ))}
        </Container>
        {/* Footer */}
        <Box mt="auto" textAlign="center" color="#888" fontSize={14} py={2} sx={{ bgcolor: 'background.paper', borderTop: '1px solid #e0e5ee' }}>
          Developed by Mushfiqur
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
