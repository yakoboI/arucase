/**
 * Public chatbot – replaces FAQ. General school questions only.
 * Rendered via portal into document.body so it always stays viewport-fixed and visible
 * (no parent transform/overflow breaking position:fixed). Shown on all public pages via PublicLayout.
 * Panel is draggable by header (touch or pointer).
 * All displayed text is passed through plain-text sanitization (no HTML execution).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { publicAPI } from '../../services/public';
import './Chatbot.css';

/** Strip HTML, dangerous control chars; keep newlines/tabs for readable replies. */
function purifyChatPlainText(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  s = DOMPurify.sanitize(s, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
  return s.trim();
}

const WELCOME_TEXT = purifyChatPlainText(
  'Hello. You can ask about fees, admissions, NECTA results, and student life. Replies use published school information only—not private student records. How can we help?'
);

const PLACEHOLDER = 'Ask about fees, admissions, NECTA results…';
const SUGGESTIONS = [
  'What are the school fees?',
  'How do I apply for admission?',
  'Where can I see NECTA results?',
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 0, role: 'bot', text: WELCOME_TEXT }]);
  const messageIdRef = useRef(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelPosition, setPanelPosition] = useState(null); // { x, y } or null for default
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const handleSuggestion = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = purifyChatPlainText(input);
    if (!text || loading) return;
    setInput('');
    const userId = messageIdRef.current++;
    setMessages((prev) => [...prev, { id: userId, role: 'user', text }]);
    setLoading(true);
    try {
      const res = await publicAPI.chat(text);
      const rawReply =
        res.data?.reply ?? "I couldn't get a response. Please try again or contact the school.";
      const reply = purifyChatPlainText(rawReply) || 'Please contact the school for more help.';
      const botId = messageIdRef.current++;
      setMessages((prev) => [...prev, { id: botId, role: 'bot', text: reply }]);
    } catch (err) {
      const data = err.response?.data;
      const raw =
        (data && (data.reply ?? data.error)) ||
        'The assistant is not available right now. Please contact the school directly for questions.';
      const fallback =
        purifyChatPlainText(raw) ||
        'The assistant is not available right now. Please contact the school directly for questions.';
      const botId = messageIdRef.current++;
      setMessages((prev) => [...prev, { id: botId, role: 'bot', text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const getPanelRect = useCallback(() => {
    if (!panelRef.current) return null;
    return panelRef.current.getBoundingClientRect();
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== undefined) return; // only primary button
    if (e.target.closest('.chatbot-close')) return; // don't drag when clicking close
    const rect = getPanelRect();
    if (!rect) return;
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: panelPosition != null ? panelPosition.x : rect.left,
      top: panelPosition != null ? panelPosition.y : rect.top,
    };
  }, [panelPosition, getPanelRect]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const rect = getPanelRect();
      if (!rect) return;
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      const { x: startX, y: startY, left, top } = dragStartRef.current;
      const x = Math.max(0, Math.min(maxX, left + (e.clientX - startX)));
      const y = Math.max(0, Math.min(maxY, top + (e.clientY - startY)));
      setPanelPosition({ x, y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, getPanelRect]);

  const content = (
    <>
      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
      >
        <i className="fas fa-comments" aria-hidden="true"></i>
      </button>

      {open && (
        <div className="chatbot-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <aside
        ref={panelRef}
        className={['chatbot-panel', open && 'chatbot-panel-open', panelPosition != null && 'chatbot-panel-dragged'].filter(Boolean).join(' ')}
        aria-label="Chat"
        role="dialog"
        style={panelPosition != null ? { left: panelPosition.x, top: panelPosition.y, right: 'auto', bottom: 'auto' } : undefined}
      >
        <div className="chatbot-panel-inner">
          <header
            className="chatbot-header chatbot-header-drag"
            onPointerDown={handlePointerDown}
            aria-label="Drag to move chat"
          >
            <h2 className="chatbot-title">
              <i className="fas fa-school" aria-hidden="true"></i>
              School information
            </h2>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chatbot-msg chatbot-msg-${m.role}`}>
                {m.role === 'bot' && (
                  <i className="fas fa-robot chatbot-msg-icon" aria-hidden="true"></i>
                )}
                <div className="chatbot-msg-bubble">
                  <p className="chatbot-msg-text">{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg chatbot-msg-bot">
                <i className="fas fa-robot chatbot-msg-icon" aria-hidden="true"></i>
                <div className="chatbot-msg-bubble chatbot-msg-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div className="chatbot-suggestions">
                <span className="chatbot-suggestions-label">Suggested questions</span>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chatbot-suggestion-btn"
                    onClick={() => handleSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-form" onSubmit={handleSend}>
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDER}
              maxLength={500}
              disabled={loading}
              aria-label="Your message"
            />
            <button type="submit" className="chatbot-send" disabled={loading || !input.trim()}>
              <i className="fas fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      </aside>
    </>
  );

  /* Portal into fixed-ui-root so menu and chat never scroll with the page (viewport-fixed layer) */
  const container =
    typeof document !== 'undefined'
      ? (document.getElementById('fixed-ui-root') || document.body)
      : null;
  if (!container) return content;
  return createPortal(content, container);
}
