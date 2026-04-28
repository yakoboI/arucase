/**
 * AI Matters – Admin: upload PDF, CSV, Word; chat over document content.
 */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './AIMatters.css';

const ACCEPT = '.pdf,.csv,.docx,.doc';
const MAX_SIZE_MB = 20;

export default function AIMatters() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Upload PDF, CSV, or Word documents above. I\'ll answer questions based only on their content.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['ai-matters-documents'],
    queryFn: async () => {
      const res = await adminAPI.getAIMattersDocuments();
      return res.data.documents || [];
    },
  });
  const documents = listData || [];

  const uploadMutation = useMutation({
    mutationFn: (formData) => adminAPI.uploadAIMattersDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-matters-documents']);
      toast.success('Document uploaded and scanned.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteAIMattersDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-matters-documents']);
      toast.success('Document removed.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete failed');
    },
  });

  const handleFile = (file) => {
    if (!file) return;
    const ext = (file.name || '').toLowerCase().split('.').pop();
    if (!['pdf', 'csv', 'docx', 'doc'].includes(ext)) {
      toast.error('Only PDF, CSV, and Word (.docx/.doc) are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error('File must be under ' + MAX_SIZE_MB + 'MB');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer?.files?.[0]);
  };

  const onSend = async (e) => {
    e?.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await adminAPI.chatAIMatters(text);
      const reply = res.data?.reply ?? 'No response.';
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      const reply = err.response?.data?.reply || err.response?.data?.message || 'Request failed. Try again.';
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AdminLayout>
      <div className="ai-matters-page">
        <header className="ai-matters-header">
          <h1><i className="fas fa-robot" /> AI Matters</h1>
          <p>Upload PDF, CSV, or Word documents. Ask questions and get answers from their content.</p>
        </header>

        <div className="ai-matters-grid">
          <section className="ai-matters-docs">
            <h2>Documents</h2>
            <div
              className={'ai-matters-upload' + (dragOver ? ' drag-over' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="ai-matters-file-input"
                onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              <i className="fas fa-cloud-upload-alt" />
              <span>Drop files here or click to upload</span>
              <small>PDF, CSV, .docx / .doc — max {MAX_SIZE_MB}MB</small>
            </div>
            {uploadMutation.isPending && <p className="ai-matters-uploading">Uploading &amp; scanning…</p>}
            <ul className="ai-matters-list">
              {listLoading ? (
                <li className="ai-matters-list-loading">Loading…</li>
              ) : documents.length === 0 ? (
                <li className="ai-matters-list-empty">No documents yet</li>
              ) : (
                documents.map((doc) => (
                  <li key={doc.id} className="ai-matters-list-item">
                    <span className="ai-matters-doc-name" title={doc.name}>{doc.name}</span>
                    <span className="ai-matters-doc-date">{formatDate(doc.created_at)}</span>
                    <button
                      type="button"
                      className="ai-matters-delete"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Remove document"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="ai-matters-chat">
            <h2>Ask about the documents</h2>
            <div className="ai-matters-messages">
              {messages.map((m, i) => (
                <div key={i} className={'ai-matters-msg ai-matters-msg-' + m.role}>
                  <div className="ai-matters-msg-bubble">
                    <p className="ai-matters-msg-text">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ai-matters-msg ai-matters-msg-bot">
                  <div className="ai-matters-msg-bubble ai-matters-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>
            <form className="ai-matters-form" onSubmit={onSend}>
              <input
                type="text"
                className="ai-matters-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything about the uploaded documents…"
                maxLength={4000}
                disabled={loading}
              />
              <button type="submit" className="ai-matters-send" disabled={loading || !message.trim()}>
                <i className="fas fa-paper-plane" />
              </button>
            </form>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
