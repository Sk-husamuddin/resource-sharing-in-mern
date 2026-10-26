import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { messageApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'inbox', 'sent'

  const fetchMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await messageApi.getAll();
      setMessages(res.data.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await messageApi.markRead(id);
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, isRead: true } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyTo || !replyText.trim()) return;

    setSendingReply(true);
    try {
      await messageApi.send({
        recipient: replyTo.sender._id === user._id ? replyTo.recipient._id : replyTo.sender._id,
        content: replyText,
        relatedResource: replyTo.relatedResource?._id,
        relatedLostFound: replyTo.relatedLostFound?._id,
      });
      setReplyText('');
      setReplyTo(null);
      fetchMessages();
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === 'inbox') return m.recipient?._id === user?._id;
    if (filter === 'sent') return m.sender?._id === user?._id;
    return true;
  });

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">Messages</h1>
            <div className="filter-tabs">
              <button
                className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({messages.length})
              </button>
              <button
                className={`tab-btn ${filter === 'inbox' ? 'active' : ''}`}
                onClick={() => setFilter('inbox')}
              >
                Inbox ({messages.filter((m) => m.recipient?._id === user?._id).length})
              </button>
              <button
                className={`tab-btn ${filter === 'sent' ? 'active' : ''}`}
                onClick={() => setFilter('sent')}
              >
                Sent ({messages.filter((m) => m.sender?._id === user?._id).length})
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="loading-state">
              <div className="spinner" /> Loading messages…
            </div>
          )}

          {!loading && !error && filteredMessages.length === 0 && (
            <div className="empty-state">
              <span>💬</span>
              <p>No messages in this folder.</p>
            </div>
          )}

          {/* Quick Reply Modal / Box */}
          {replyTo && (
            <div className="reply-box-card">
              <div className="reply-header">
                <h3>
                  Reply to{' '}
                  {replyTo.sender._id === user._id
                    ? replyTo.recipient?.username
                    : replyTo.sender?.username}
                </h3>
                <button className="btn-close" onClick={() => setReplyTo(null)}>
                  ✕
                </button>
              </div>
              <form onSubmit={handleSendReply}>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Type your response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                />
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary" disabled={sendingReply}>
                    {sendingReply ? 'Sending…' : 'Send'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {!loading && filteredMessages.length > 0 && (
            <div className="messages-list">
              {filteredMessages.map((msg) => {
                const isIncoming = msg.recipient?._id === user?._id;
                return (
                  <div
                    key={msg._id}
                    className={`message-card ${!msg.isRead && isIncoming ? 'unread' : ''}`}
                  >
                    <div className="message-header">
                      <div className="message-sender-info">
                        <strong>
                          {isIncoming
                            ? `From: ${msg.sender?.displayName || msg.sender?.username || 'User'}`
                            : `To: ${msg.recipient?.displayName || msg.recipient?.username || 'User'}`}
                        </strong>
                        <span className="message-direction-tag">
                          {isIncoming ? 'Incoming' : 'Sent'}
                        </span>
                      </div>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {msg.relatedResource && (
                      <div className="message-context">
                        Resource:{' '}
                        <Link to={`/resources/${msg.relatedResource._id}`}>
                          {msg.relatedResource.title}
                        </Link>
                      </div>
                    )}

                    {msg.relatedLostFound && (
                      <div className="message-context">
                        Lost &amp; Found Item:{' '}
                        <Link to={`/lost-found/${msg.relatedLostFound._id}`}>
                          {msg.relatedLostFound.title}
                        </Link>
                      </div>
                    )}

                    <p className="message-body">{msg.content}</p>

                    <div className="message-actions">
                      {isIncoming && !msg.isRead && (
                        <button
                          onClick={() => handleMarkRead(msg._id)}
                          className="btn-sm btn-secondary"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setReplyTo(msg);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="btn-sm btn-primary"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Messages;
