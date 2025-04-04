import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getAvailableUsers, getMessages, sendMessage, getOrCreateConversation, verifyAuth } from "../api";

const Chat = () => {
  const [authUser, setAuthUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch authenticated user and available users on mount
  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const authData = await verifyAuth();
        if (authData.isAuthenticated) {
          setAuthUser(authData);
          setUserRole(authData.role || null);
          fetchUsers();
        }
      } catch (err) {
        setError("Failed to verify authentication.");
      }
    };
    fetchAuthData();
  }, []);

  // Fetch available users
  const fetchUsers = async () => {
    try {
      const users = await getAvailableUsers();
      setAvailableUsers(users);
    } catch (err) {
      setError("Failed to fetch available users.");
    }
  };

  // Filter users based on authenticated user's role
  useEffect(() => {
    if (userRole && availableUsers.length > 0) {
      if (userRole === "patient") {
        setFilteredUsers(availableUsers.filter((user) => user.role === "doctor"));
      } else if (userRole === "doctor") {
        setFilteredUsers(availableUsers.filter((user) => 
          user.role === "doctor" || user.role === "manager" || user.role === "patient"));      
      } else {
        setFilteredUsers([]);
      }
    }
  }, [userRole, availableUsers]);

  // Fetch messages when an active chat is selected
  useEffect(() => {
  if (!activeChat || !activeChat.conversationId) return;

  const interval = setInterval(async () => {
    try {
      const chatMessages = await getMessages(activeChat.conversationId);
      if (JSON.stringify(chatMessages) !== JSON.stringify(messages)) {
        setMessages(chatMessages);
        scrollToBottom();
      }
    } catch (err) {
      setError("Failed to fetch messages.");
    }
  }, 3000); // Fetch messages every 3 seconds

  return () => clearInterval(interval); // Cleanup on unmount or activeChat change
}, [activeChat, messages]);


  const fetchMessages = async (conversationId) => {
    try {
      const chatMessages = await getMessages(conversationId);
      setMessages(chatMessages);
      scrollToBottom();
    } catch (err) {
      setError("Failed to fetch messages.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUserClick = async (user) => {
    try {
      const conversation = await getOrCreateConversation(user.id);
      if (conversation) {
        setActiveChat({ ...user, conversationId: conversation.id });
        setError(null);
      } else {
        setError("Failed to start a conversation.");
      }
    } catch (err) {
      setError("Failed to fetch or create conversation.");
    }
  };

  const handleSend = async () => {
    if (inputValue.trim() && activeChat && activeChat.conversationId) {
      const newMessage = {
        receiver_id: activeChat.id,
        message_type: "text",
        message: inputValue,
      };

      try {
        const sentMessage = await sendMessage(activeChat.conversationId, newMessage);
        if (sentMessage) {
          setMessages([...messages, sentMessage]);
        } else {
          setError("Failed to send message.");
        }
        setInputValue("");
        scrollToBottom();
      } catch (err) {
        setError("Failed to send message.");
      }
    }
  };

  if (!authUser) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className="chat-container">
      {error && <div className="error-message">{error}</div>}

      <div className="chat-sidebar">
        <h2 className="chat-title">Chats</h2>
        <div className="chat-list">
          {filteredUsers.map((user) => (
            <motion.button
              key={user.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`chat-user-button ${activeChat?.id === user.id ? "active-chat" : ""}`}
              onClick={() => handleUserClick(user)}
            >
              {user.first_name} {user.last_name}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="chat-window">
        {activeChat ? (
          <>
            <h2 className="chat-header">
              Chatting with {activeChat.first_name} {activeChat.last_name}
            </h2>
            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${
                    message?.sender?.id === authUser?.id ? "sent-message" : "received-message"
                  }`}
                >
                  <div className="message-content">
                    <p>{message.message}</p>
                    <p className="message-timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="chat-input"
                placeholder="Type a message..."
              />
              <button onClick={handleSend} className="send-button">
                Send
              </button>
            </div>
          </>
        ) : (
          <h2 className="chat-placeholder">Select a chat to start messaging</h2>
        )}
      </div>
    </div>
  );
};

export default Chat;
