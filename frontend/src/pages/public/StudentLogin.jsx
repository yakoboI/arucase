/**
 * Student Login Page - Access Student Reports with Pass ID
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import './StudentLogin.css';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    adm_no: '',
    year: '',
    pass_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.adm_no.trim() || !formData.year.trim() || !formData.pass_id.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const yearNum = parseInt(formData.year, 10);
    if (Number.isNaN(yearNum)) {
      toast.error('Please enter a valid year');
      return;
    }

    setIsLoading(true);
    try {
      const res = await publicAPI.studentLogin({
        adm_no: formData.adm_no.trim(),
        year: yearNum,
        pass_id: formData.pass_id.trim().toUpperCase()
      });

      if (res.data?.success && res.data.student) {
        sessionStorage.setItem('studentData', JSON.stringify(res.data.student));
        toast.success('Login successful!');
        navigate('/student/dashboard');
      } else {
        toast.error(res.data?.message || 'Login failed. Please check your details.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Invalid credentials. Please check your information.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="student-login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <i className="fas fa-graduation-cap"></i>
              <h2>Student Portal</h2>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <div className="input-wrapper">
                  <i className="fas fa-id-card input-icon"></i>
                  <input
                    type="text"
                    value={formData.adm_no}
                    onChange={(e) => setFormData({ ...formData, adm_no: e.target.value })}
                    className="form-input"
                    placeholder="Admission Number"
                    required
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <i className="fas fa-calendar input-icon"></i>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="form-input"
                    placeholder="Year"
                    required
                    min={new Date().getFullYear() - 10}
                    max={new Date().getFullYear() + 5}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <i className="fas fa-key input-icon"></i>
                  <input
                    type="text"
                    value={formData.pass_id}
                    onChange={(e) => setFormData({ ...formData, pass_id: e.target.value.toUpperCase() })}
                    className="form-input"
                    placeholder="Pass ID"
                    required
                    maxLength="6"
                    autoComplete="off"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-sign-in-alt"></i>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default StudentLogin;

