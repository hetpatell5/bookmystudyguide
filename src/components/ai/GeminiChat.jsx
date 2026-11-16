import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import api from '../../api';
import './GeminiChat.scss';

const GeminiChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'Hello! I am your AI study assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await api.post('/api/chatbot', { message: input });
            setMessages(prev => [...prev, { role: 'bot', content: res.data.reply }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="gemini-chat-container">
            {/* Chat Toggle Button */}
            <button 
                className={`chat-bubble-toggle ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window animate__animated animate__fadeInUp animate__faster">
                    <div className="chat-header">
                        <div className="header-info">
                            <div className="bot-avatar">
                                <Bot size={24} />
                            </div>
                            <div className="bot-details">
                                <h3>BMSG AI Assistant</h3>
                                <span>Always Online</span>
                            </div>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role} animate__animated animate__fadeIn`}>
                                {msg.content}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message bot">
                                <div className="typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <form onSubmit={handleSendMessage}>
                            <input 
                                type="text" 
                                placeholder="Ask about books, notes, projects..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button type="submit" className="send-btn" disabled={isTyping || !input.trim()}>
                                {isTyping ? <Sparkles size={18} className="animate-pulse" /> : <Send size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeminiChat;
