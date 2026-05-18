/**
 * Public chatbot – viewport-fixed on all public routes, draggable to any corner.
 * Portaled to document.body so page scroll/transform never hides it.
 */
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { publicAPI } from '../../services/public';
import { CHATBOT_TOPICS } from '../../constants/chatbotTopics';
import {
  FAB_SIZE,
  loadChatAnchor,
  saveChatAnchor,
  cornerToFabPosition,
  snapToCorner,
  clampFabPosition,
  panelPositionForCorner,
} from '../../utils/chatbotAnchor';
import './Chatbot.css';

function purifyChatPlainText(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  s = DOMPurify.sanitize(s, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
  return s.trim();
}

const WELCOME_TEXT = 'Habari! Uliza kuhusu seminari.';
const PANEL_W = 352;
const PANEL_H_EST = 420;
const DRAG_THRESHOLD = 6;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 0, role: 'bot', text: WELCOME_TEXT }]);
  const messageIdRef = useRef(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [anchor, setAnchor] = useState(() => loadChatAnchor());
  const [fabPos, setFabPos] = useState(() => {
    const a = loadChatAnchor();
    return cornerToFabPosition(a.corner);
  });
  const [panelPos, setPanelPos] = useState({ left: 0, top: 0 });

  const [fabDragging, setFabDragging] = useState(false);
  const [panelDragging, setPanelDragging] = useState(false);
  const fabDragRef = useRef({ moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const panelDragRef = useRef({ startX: 0, startY: 0, left: 0, top: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPos = useCallback(() => {
    const pos = panelPositionForCorner(anchor.corner, fabPos, PANEL_W, PANEL_H_EST);
    setPanelPos(pos);
  }, [anchor.corner, fabPos]);

  useLayoutEffect(() => {
    updatePanelPos();
  }, [updatePanelPos, open]);

  useEffect(() => {
    const onResize = () => {
      const next = cornerToFabPosition(anchor.corner);
      setFabPos(next);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [anchor.corner]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const sendText = useCallback(
    async (rawText) => {
      const text = purifyChatPlainText(rawText);
      if (!text || loading) return;
      setOpen(true);
      setInput('');
      const userId = messageIdRef.current++;
      setMessages((prev) => [...prev, { id: userId, role: 'user', text }]);
      setLoading(true);
      try {
        const res = await publicAPI.chat(text);
        const rawReply =
          res.data?.reply ?? 'Samahani, sijapata jibu. Jaribu tena au wasiliana na ofisi ya shule.';
        const reply = purifyChatPlainText(rawReply) || 'Wasiliana na shule kwa msaada zaidi.';
        const botId = messageIdRef.current++;
        setMessages((prev) => [...prev, { id: botId, role: 'bot', text: reply }]);
      } catch (err) {
        const data = err.response?.data;
        const raw =
          (data && (data.reply ?? data.error)) ||
          'Msaidizi haupatikani kwa sasa. Tafadhali wasiliana na shule moja kwa moja.';
        const fallback = purifyChatPlainText(raw) || 'Msaidizi haupatikani kwa sasa.';
        const botId = messageIdRef.current++;
        setMessages((prev) => [...prev, { id: botId, role: 'bot', text: fallback }]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleSend = (e) => {
    e?.preventDefault();
    sendText(input);
  };

  const handleTopic = (topic) => {
    sendText(topic.prompt);
  };

  const applyAnchor = useCallback((nextAnchor, nextFabPos) => {
    setAnchor(nextAnchor);
    setFabPos(nextFabPos);
    saveChatAnchor(nextAnchor);
  }, []);

  const handleFabPointerDown = (e) => {
    if (e.button !== 0 && e.button !== undefined) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    fabDragRef.current = {
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: fabPos.x,
      originY: fabPos.y,
    };
    setFabDragging(true);
  };

  const handleFabPointerMove = (e) => {
    if (!fabDragging) return;
    const { startX, startY, originX, originY } = fabDragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      fabDragRef.current.moved = true;
    }
    const next = clampFabPosition(originX + dx, originY + dy);
    setFabPos(next);
  };

  const handleFabPointerUp = (e) => {
    if (!fabDragging) return;
    setFabDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!fabDragRef.current.moved) {
      setOpen((v) => !v);
      return;
    }
    const snapped = snapToCorner(fabPos.x, fabPos.y);
    applyAnchor({ corner: snapped.corner }, { x: snapped.x, y: snapped.y });
  };

  const handlePanelHeaderDown = (e) => {
    if (e.button !== 0 && e.button !== undefined) return;
    if (e.target.closest('.chatbot-close')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panelDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      left: panelPos.left,
      top: panelPos.top,
    };
    setPanelDragging(true);
  };

  useEffect(() => {
    if (!panelDragging) return;
    const onMove = (ev) => {
      const { startX, startY, left, top } = panelDragRef.current;
      const panelEl = panelRef.current;
      const w = panelEl?.offsetWidth || PANEL_W;
      const h = panelEl?.offsetHeight || PANEL_H_EST;
      const maxX = window.innerWidth - w - 8;
      const maxY = window.innerHeight - h - 8;
      setPanelPos({
        left: Math.max(8, Math.min(maxX, left + (ev.clientX - startX))),
        top: Math.max(8, Math.min(maxY, top + (ev.clientY - startY))),
      });
    };
    const onUp = () => setPanelDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [panelDragging]);

  const showTopics = messages.length <= 1 && !loading;

  const widget = (
    <div className="chatbot-widget" aria-hidden={false}>
      <button
        type="button"
        className={['chatbot-fab', fabDragging && 'chatbot-fab--dragging', open && 'chatbot-fab--open']
          .filter(Boolean)
          .join(' ')}
        style={{ left: fabPos.x, top: fabPos.y, width: FAB_SIZE, height: FAB_SIZE }}
        onPointerDown={handleFabPointerDown}
        onPointerMove={handleFabPointerMove}
        onPointerUp={handleFabPointerUp}
        onPointerCancel={handleFabPointerUp}
        aria-label={open ? 'Funga mazungumzo' : 'Fungua mazungumzo'}
        aria-expanded={open}
      >
        <i className={`fas ${open ? 'fa-chevron-down' : 'fa-comments'}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="chatbot-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            ref={panelRef}
            className={['chatbot-panel', 'chatbot-panel-open', panelDragging && 'chatbot-panel--dragging']
              .filter(Boolean)
              .join(' ')}
            style={{ left: panelPos.left, top: panelPos.top, width: PANEL_W }}
            aria-label="Mazungumzo"
            role="dialog"
          >
            <div className="chatbot-panel-inner">
              <header
                className="chatbot-header chatbot-header-drag"
                onPointerDown={handlePanelHeaderDown}
                aria-label="Buruta dirisha"
              >
                <h2 className="chatbot-title">
                  <i className="fas fa-comments" aria-hidden="true" />
                  ARUCASE
                </h2>
                <button
                  type="button"
                  className="chatbot-close"
                  onClick={() => setOpen(false)}
                  aria-label="Funga"
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </header>

              <div className="chatbot-messages">
                {messages.map((m) => (
                  <div key={m.id} className={`chatbot-msg chatbot-msg-${m.role}`}>
                    {m.role === 'bot' && (
                      <i className="fas fa-leaf chatbot-msg-icon" aria-hidden="true" />
                    )}
                    <div className="chatbot-msg-bubble">
                      <p className="chatbot-msg-text">{m.text}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="chatbot-msg chatbot-msg-bot">
                    <i className="fas fa-leaf chatbot-msg-icon" aria-hidden="true" />
                    <div className="chatbot-msg-bubble chatbot-msg-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                {showTopics && (
                  <div className="chatbot-topics">
                    {CHATBOT_TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        className="chatbot-topic-btn"
                        onClick={() => handleTopic(topic)}
                      >
                        {topic.label}
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
                  placeholder="Andika swali…"
                  maxLength={500}
                  disabled={loading}
                  aria-label="Swali lako"
                />
                <button type="submit" className="chatbot-send" disabled={loading || !input.trim()}>
                  <i className="fas fa-paper-plane" aria-hidden="true" />
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </div>
  );

  if (typeof document === 'undefined') return widget;
  return createPortal(widget, document.body);
}
