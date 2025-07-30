import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, TextField, Dialog, DialogContent, LinearProgress, Alert, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';

export default function ChatWindow({ user, open, minimized, onClose, onMinimize, messages, onSend, chatInput, setChatInput }) {
  const messagesEndRef = useRef(null);
  const [files, setFiles] = useState([]); // multiple files
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordTimer, setRecordTimer] = useState(0);
  const recordTimerRef = useRef();
  const fileInputRef = useRef();
  const [imagePreview, setImagePreview] = useState({ open: false, url: '', alt: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    console.log('messages:', messages);
    if (!minimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  const handleSend = async () => {
    if (!chatInput.trim() && files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    
    try {
      await onSend(chatInput, files, () => {
        setChatInput('');
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
        setUploadProgress(0);
      });
    } catch (error) {
      setUploadError(error.message || 'Failed to send message');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const startRecording = async () => {
    if (recording) return;
    setRecordedChunks([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try to use M4A format if supported, fallback to WebM
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const recorder = new window.MediaRecorder(stream, { mimeType });
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordTimer(0);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
      };
      recorder.onstop = () => {
        const fileExtension = mimeType === 'audio/mp4' ? 'm4a' : 'webm';
        const blob = new Blob(recordedChunks, { type: mimeType });
        const file = new File([blob], `voice-message.${fileExtension}`, { type: mimeType });
        console.log(`Voice message recorded: ${fileExtension} format, size: ${file.size} bytes`);
        
        // Only send if recording duration is at least 1 second and file has content
        if (recordTimer >= 1 && file.size > 0) {
          onSend('', [file], () => {
            setRecordedChunks([]);
          });
        } else {
          console.log('Recording too short or empty, not sending');
          setRecordedChunks([]);
        }
      };
      recorder.start();
      // Timer for max 1 minute
      let seconds = 0;
      recordTimerRef.current = setInterval(() => {
        seconds += 1;
        setRecordTimer(seconds);
        if (seconds >= 60) {
          recorder.stop();
          setRecording(false);
          clearInterval(recordTimerRef.current);
        }
      }, 1000);
    } catch (err) {
      setRecording(false);
      setRecordTimer(0);
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      try {
        mediaRecorder.stop();
        setRecording(false);
        clearInterval(recordTimerRef.current);
      } catch (error) {
        console.error('Error stopping recording:', error);
        setRecording(false);
        clearInterval(recordTimerRef.current);
      }
    }
  };

  const handleImageClick = (url, alt) => {
    setImagePreview({ open: true, url, alt });
  };

  const validateFile = (file) => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20MB
    
    // Check if it's a GIF
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    
    if (file.type.startsWith('image/') && !isGif && file.size > MAX_PHOTO_SIZE) {
      return `Image ${file.name} is too large. Maximum size is 20MB.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} is too large. Maximum size is 50MB.`;
    }
    return null;
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const errors = [];
    const validFiles = [];
    
    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
      setTimeout(() => setUploadError(''), 5000);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: minimized ? 0 : 20,
        right: 20 + (user.index || 0) * 350,
        width: { xs: '100vw', sm: 320 },
        maxWidth: 360,
        zIndex: 1300,
        boxShadow: 6,
        borderRadius: 3,
        bgcolor: '#fff',
        overflow: 'hidden',
        transition: 'all 0.2s',
        minHeight: minimized ? 48 : { xs: '100vh', sm: 400 },
        height: minimized ? 48 : { xs: '100vh', sm: 'auto' },
        display: open ? 'block' : 'none',
      }}
    >
      <Box 
        sx={{ 
          bgcolor: '#1976d2', 
          color: '#fff', 
          p: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          '&:hover': {
            bgcolor: '#1565c0'
          },
          minHeight: 48
        }}
        onClick={minimized ? onMinimize : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontWeight: 600 }}>{user.full_name}</span>
          {minimized && (
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Click to restore</span>
          )}
        </Box>
        <Box>
          <Tooltip title="Minimize">
          <IconButton size="small" onClick={onMinimize}><MinimizeIcon sx={{ color: '#fff' }} /></IconButton>
          </Tooltip>
          <Tooltip title="Close">
          <IconButton size="small" onClick={onClose}><CloseIcon sx={{ color: '#fff' }} /></IconButton>
          </Tooltip>
        </Box>
      </Box>
      {!minimized && (
        <>
          <Box sx={{ p: 1, maxHeight: { xs: '70vh', sm: 300 }, minHeight: 200, overflowY: 'auto', bgcolor: '#f4f7fa', display: 'flex', flexDirection: 'column' }}>
            {messages.map((msg, i) => {
              console.log('msg:', msg);
              const prevMsg = messages[i - 1];
              const showDate = !prevMsg || (msg.timestamp && prevMsg && prevMsg.timestamp && msg.timestamp.slice(0, 10) !== prevMsg.timestamp.slice(0, 10));
              const isAdmin = msg.sender === 'admin';
              const initials = isAdmin ? 'A' : (user.full_name ? user.full_name[0] : 'U');
              // Show avatar only if first in group
              const showAvatar = !prevMsg || prevMsg.sender !== msg.sender;
              return (
                <React.Fragment key={msg.message + '-' + i}>
                  {showDate && msg.timestamp && (
                    <Box sx={{ textAlign: 'center', color: '#888', fontSize: 12, my: 1 }}>
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </Box>
                  )}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: isAdmin ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    mb: showAvatar ? 2 : 0.5,
                  }}>
                    {/* Avatar/Initials */}
                    {showAvatar ? (
                      isAdmin ? (
                        <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32, mr: 0, ml: 1 }}>
                          {initials}
                        </Avatar>
                      ) : (
                        user.photo_url ? (
                          <Avatar src={user.photo_url} alt={user.full_name} sx={{ width: 32, height: 32, mr: 1, ml: 0 }} />
                        ) : (
                          <Avatar sx={{ bgcolor: '#bbb', width: 32, height: 32, mr: 1, ml: 0 }}>
                            {initials}
                          </Avatar>
                        )
                      )
                    ) : (
                      <Box sx={{ width: 32, height: 32, mr: isAdmin ? 0 : 1, ml: isAdmin ? 1 : 0 }} />
                    )}
                    {/* Bubble + timestamp */}
                    <Box>
                      <Box sx={{
                        bgcolor: isAdmin ? '#1976d2' : '#e0e0e0',
                        color: isAdmin ? '#fff' : '#000',
                        borderRadius: isAdmin
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                        px: 2, py: 1.2,
                        maxWidth: '260px',
                        boxShadow: 1,
                        fontSize: 15,
                        textAlign: 'left',
                        mb: 0.3,
                        wordBreak: 'break-word',
                      }}>
                        {(() => {
                          if (msg.message && msg.message.startsWith('[image]')) {
                            const url = msg.message.replace('[image]', '');
                            return (
                              <img 
                                src={url} 
                                alt="user sent" 
                                style={{ 
                                  maxWidth: 180, 
                                  borderRadius: 8, 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                                onClick={() => handleImageClick(url, 'Image sent by user')}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'scale(1.02)';
                                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            );
                          } else if (msg.message && msg.message.startsWith('[gif]')) {
                            const url = msg.message.replace('[gif]', '');
                            return (
                              <img 
                                src={url} 
                                alt="GIF sent by user" 
                                style={{ 
                                  maxWidth: 180, 
                                  borderRadius: 8, 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                                onClick={() => handleImageClick(url, 'GIF sent by user')}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'scale(1.02)';
                                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            );
                          } else if (msg.message && msg.message.startsWith('[video]')) {
                            const url = msg.message.replace('[video]', '');
                            return <video src={url} controls style={{ maxWidth: 180, borderRadius: 8 }} />;
                          } else if (msg.message && msg.message.startsWith('[voice]')) {
                            const url = msg.message.replace('[voice]', '');
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%', 
                                  bgcolor: isAdmin ? '#fff' : '#1976d2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: isAdmin ? '#1976d2' : '#fff'
                                  }} />
                                </Box>
                                <audio 
                                  src={url} 
                                  controls 
                                  style={{ 
                                    maxWidth: 200,
                                    height: 32
                                  }}
                                />
                              </Box>
                            );
                          } else if (msg.message && msg.message.startsWith('[audio]')) {
                            const url = msg.message.replace('[audio]', '');
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%', 
                                  bgcolor: isAdmin ? '#fff' : '#1976d2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: isAdmin ? '#1976d2' : '#fff'
                                  }} />
                                </Box>
                                <audio 
                                  src={url} 
                                  controls 
                                  style={{ 
                                    maxWidth: 200,
                                    height: 32
                                  }}
                                />
                              </Box>
                            );
                          } else {
                            return msg.message;
                          }
                        })()}
                      </Box>
                      {msg.timestamp && (
                        <Box sx={{ fontSize: 10, color: '#888', textAlign: isAdmin ? 'right' : 'left', px: 1, mt: 0.2 }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isAdmin && (
                            <span style={{ marginLeft: 4, fontSize: 12 }}>
                              ✓✓
                            </span>
                          )}
                        </Box>
                      )}
                    </Box>
              </Box>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
          
          {/* Upload Progress */}
          {isUploading && (
            <Box sx={{ p: 1, bgcolor: '#f4f7fa' }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Box sx={{ fontSize: 12, color: '#666', mt: 0.5 }}>Uploading... {uploadProgress}%</Box>
            </Box>
          )}
          
          {/* Upload Error */}
          {uploadError && (
            <Box sx={{ p: 1 }}>
              <Alert severity="error" onClose={() => setUploadError('')} sx={{ fontSize: 12 }}>
                {uploadError}
              </Alert>
            </Box>
          )}
          
          {/* File preview */}
          {files && files.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, bgcolor: '#f4f7fa', p: 1, borderRadius: 2, gap: 1 }}>
              {files.map((file, idx) => (
                <Box key={file.name + idx} sx={{ position: 'relative' }}>
                  {file.type && file.type.startsWith('image/') ? (
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={file.name} 
                      style={{ 
                        width: 48, 
                        height: 48, 
                        objectFit: 'cover', 
                        borderRadius: 8 
                      }} 
                    />
                  ) : (
                    <AttachFileIcon sx={{ fontSize: 40, color: '#888' }} />
                  )}
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => setFiles(files.filter((_, i) => i !== idx))} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: '#fff' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ p: 1, borderTop: '1px solid #eee', bgcolor: '#fafbfc', display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Attach file">
              <IconButton component="label" sx={{ mr: 1 }}>
                <AttachFileIcon />
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </IconButton>
            </Tooltip>
            <Box sx={{ position: 'relative', mr: 1 }}>
              <Tooltip title={recording ? "Recording..." : "Hold to record voice"}>
                <IconButton
                  color={recording ? 'error' : 'default'}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isUploading}
                  sx={{
                    transition: 'all 0.2s ease',
                    transform: recording ? 'scale(1.1)' : 'scale(1)',
                    bgcolor: recording ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                    '&:hover': {
                      bgcolor: recording ? 'rgba(244, 67, 54, 0.2)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <MicIcon />
                </IconButton>
              </Tooltip>
              {recording && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: -10, 
                  left: 40, 
                  display: 'flex', 
                  alignItems: 'center',
                  bgcolor: 'rgba(244, 67, 54, 0.9)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  <span style={{ color: 'white', fontWeight: 700, marginRight: 4 }}>●</span>
                  <span>{recordTimer}s</span>
                </Box>
              )}
            </Box>
            <TextField
              size="small"
              fullWidth
              placeholder="Type a message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (chatInput.trim() || files.length > 0)) { handleSend(); } }}
              sx={{ flex: 1 }}
              disabled={recording || isUploading}
            />
            <Tooltip title="Send">
              <IconButton 
                color="primary" 
                disabled={(!chatInput.trim() && files.length === 0) || isUploading} 
                onClick={handleSend} 
                sx={{ ml: 1 }}
              >
              <SendIcon />
            </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
      
      {/* Image Preview Dialog */}
      <Dialog 
        open={imagePreview.open} 
        onClose={() => setImagePreview({ open: false, url: '', alt: '' })}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, textAlign: 'center', position: 'relative' }}>
          <IconButton
            onClick={() => setImagePreview({ open: false, url: '', alt: '' })}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.7)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          <img 
            src={imagePreview.url} 
            alt={imagePreview.alt}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh', 
              objectFit: 'contain',
              borderRadius: 8
            }}
          />
        </DialogContent>
      </Dialog>
    </Paper>
  );
} 