import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { useSound } from '../../utils/useSound';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { playLogin } = useSound();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        toast.success('Login successful!');
        try {
          playLogin();
        } catch (soundError) {
          // Ignore sound errors - don't block login
          console.warn('Sound playback failed:', soundError);
        }
        navigate('/admin');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      // Handle different types of errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
      } else if (err.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please try again.');
      } else {
        toast.error(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add global error handler for uncaught promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  return (
    <div className="login-page">
      <Link to="/" className="back-button" aria-label="Back to Home">
        <i className="fas fa-arrow-left"></i>
        <span>Back to Home</span>
      </Link>
      
      <div className="login-container">
        <div className="login-header">
          <h1>Staff -portal</h1>
          <p>School Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-with-icon">
              <i className="fas fa-user input-icon"></i>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="input-with-icon-field"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <i className="fas fa-key input-icon"></i>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-with-icon-field"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loading message="" /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

