import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  aiChatApi,
  ActionType,
  type ChatMessage,
  type DoctorInfo,
  type AppointmentInfo,
} from "../../api/ai.api";
import styles from "./AISearchPage.module.css";

interface DisplayMessage extends ChatMessage {
  actionType?: ActionType;
  payload?: any;
  disclaimer?: string;
}

const AISearchPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        userId: "system",
        role: "assistant",
        content:
          "Hello! I'm your AI health assistant. How can I help you today?\n\nYou can:\n• Ask about symptoms\n• Search for doctors\n• View your appointments\n• Book appointments",
        timestamp: new Date().toISOString(),
      },
    ]);
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    if (!user?.id) return;
    try {
      const context = await aiChatApi.getConversationContext(user.id);
      if (context?.messages?.length > 0) {
        setMessages(context.messages);
      }
    } catch {
      /* keep welcome message */
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.id || isLoading) return;

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      userId: user.id,
      role: "user",
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const result = await aiChatApi.sendMessage(user.id, userMsg.content);
      if (result.success && result.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            userId: "assistant",
            role: "assistant",
            content: result.data!.message,
            timestamp: new Date().toISOString(),
            actionType: result.data!.actionType,
            payload: result.data!.payload,
            disclaimer: result.data!.disclaimer,
          },
        ]);
      } else {
        throw new Error(result.message || "Failed to get response");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          userId: "system",
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleActionButton = (actionType: ActionType, payload: any) => {
    if (
      actionType === ActionType.SEARCH_DOCTOR ||
      actionType === ActionType.BOOK_APPOINTMENT
    ) {
      navigate("/doctors", {
        state: { specialization: payload?.specialization },
      });
    } else if (actionType === ActionType.SHOW_APPOINTMENTS) {
      navigate("/appointments");
    }
  };

  const clearChat = async () => {
    if (!window.confirm("Clear conversation history?")) return;
    if (user?.id) {
      try {
        await aiChatApi.clearContext(user.id);
      } catch {
        /* silent */
      }
    }
    setMessages([]);
    loadHistory();
  };

  const renderDoctorCard = (doctor: DoctorInfo) => {
    const locationParts = [doctor.city, doctor.state].filter(Boolean);
    return (
      <div key={doctor.id} className={styles.aiDoctorCard}>
        <div className={styles.aiDoctorInfo}>
          <p className={styles.aiDoctorName}>{doctor.name}</p>
          <p className={styles.aiDoctorSpec}>{doctor.specialization}</p>
          {locationParts.length > 0 && (
            <p className={styles.aiDoctorLoc}>📍 {locationParts.join(", ")}</p>
          )}
          {doctor.rating && (
            <p className={styles.aiDoctorRating}>⭐ {doctor.rating}</p>
          )}
          {doctor.consultationFee && (
            <p className={styles.aiDoctorFee}>${doctor.consultationFee}</p>
          )}
        </div>
      </div>
    );
  };

  const renderAppointmentCard = (appt: AppointmentInfo) => (
    <div key={appt.id} className={styles.aiApptCard}>
      <p className={styles.aiApptDoctor}>{appt.doctorName}</p>
      {appt.specialization && (
        <p className={styles.aiApptSpec}>{appt.specialization}</p>
      )}
      <p className={styles.aiApptDate}>
        📅 {appt.date} {appt.startTime}–{appt.endTime}
      </p>
      <span className={styles.aiApptStatus}>{appt.status.toUpperCase()}</span>
    </div>
  );

  const renderMessage = (msg: DisplayMessage) => {
    const isUser = msg.role === "user";
    return (
      <div
        key={msg.id}
        className={`${styles.messageRow} ${isUser ? styles.userRow : styles.assistantRow}`}
      >
        {!isUser && <div className={styles.botAvatar}>🤖</div>}
        <div
          className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}
        >
          <p className={styles.bubbleText}>{msg.content}</p>

          {msg.disclaimer && (
            <p className={styles.disclaimer}>{msg.disclaimer}</p>
          )}

          {/* Doctor cards from payload */}
          {msg.payload?.doctors?.length > 0 && (
            <div className={styles.payloadSection}>
              <p className={styles.payloadTitle}>Doctors Found:</p>
              {msg.payload.doctors.map((d: DoctorInfo) => renderDoctorCard(d))}
              <button
                className={styles.actionBtn}
                onClick={() =>
                  handleActionButton(ActionType.SEARCH_DOCTOR, msg.payload)
                }
              >
                View All Doctors →
              </button>
            </div>
          )}

          {/* Appointment cards */}
          {msg.payload?.appointments?.length > 0 && (
            <div className={styles.payloadSection}>
              <p className={styles.payloadTitle}>Your Appointments:</p>
              {msg.payload.appointments.map((a: AppointmentInfo) =>
                renderAppointmentCard(a),
              )}
              <button
                className={styles.actionBtn}
                onClick={() =>
                  handleActionButton(ActionType.SHOW_APPOINTMENTS, msg.payload)
                }
              >
                View All Appointments →
              </button>
            </div>
          )}

          {/* Action button if no payload items */}
          {msg.actionType &&
            msg.actionType !== ActionType.NONE &&
            !msg.payload?.doctors?.length &&
            !msg.payload?.appointments?.length && (
              <button
                className={styles.actionBtn}
                onClick={() => handleActionButton(msg.actionType!, msg.payload)}
              >
                {msg.actionType === ActionType.SEARCH_DOCTOR
                  ? "🔍 Search Doctors"
                  : msg.actionType === ActionType.SHOW_APPOINTMENTS
                    ? "📅 View Appointments"
                    : msg.actionType === ActionType.BOOK_APPOINTMENT
                      ? "📋 Book Appointment"
                      : "View"}
              </button>
            )}

          <span className={styles.timestamp}>
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {isUser && <div className={styles.userAvatar}>👤</div>}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Dashboard
        </Link>
        <div className={styles.headerCenter}>
          <span className={styles.botIcon}>🤖</span>
          <div>
            <h1 className={styles.pageTitle}>AI Health Assistant</h1>
            <p className={styles.pageSubtitle}>Powered by AI</p>
          </div>
        </div>
        <button className={styles.clearButton} onClick={clearChat}>
          Clear
        </button>
      </header>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map(renderMessage)}
        {isLoading && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.botAvatar}>🤖</div>
            <div
              className={`${styles.bubble} ${styles.assistantBubble} ${styles.typingBubble}`}
            >
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder="Ask me anything about your health..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          className={styles.sendButton}
          onClick={sendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default AISearchPage;
