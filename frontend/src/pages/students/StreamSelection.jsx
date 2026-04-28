/**
 * Stream Selection Page for FORM I-IV (after year selection)
 * or FORM V-VI (initial selection).
 * Non-admin users only see FORM V-VI streams (classes) allocated to them.
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './StreamSelection.css';

const standardStreams = ['A', 'B'];
const FORM_VVI_STREAMS = [
  { code: 'PCB', name: 'Physics, Chemistry, Biology' },
  { code: 'PCM', name: 'Physics, Chemistry, Mathematics' },
  { code: 'EGM', name: 'Economics, Geography, Mathematics' },
  { code: 'HGE', name: 'History, Geography, Economics' },
  { code: 'HGL', name: 'History, Geography, Literature' },
  { code: 'PGM', name: 'Physics, Geography, Advanced Mathematics' },
];

const StreamSelection = ({ formLevel, isFormVOrVI = false }) => {
  const { year } = useParams();
  const { hasClass } = useAuth();

  const formVVIStreams = useMemo(() => {
    if (!isFormVOrVI) return FORM_VVI_STREAMS;
    return FORM_VVI_STREAMS.filter((s) => hasClass(`${formLevel} ${s.code}`));
  }, [isFormVOrVI, formLevel, hasClass]);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return '/admin/students/registration';
    }
    // For FORM I-IV, go back to year selection
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/students/registration/${formMap[formLevel]}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      // For FORM V-VI, after stream selection, go to year selection
      const formMap = {
        'FORM V': 'form-v',
        'FORM VI': 'form-vi',
      };
      return `/admin/students/registration/${formMap[formLevel]}/stream/${stream}/years`;
    } else {
      // For FORM I-IV, after stream selection, go to action selection
      const formMap = {
        'FORM I': 'form-i',
        'FORM II': 'form-ii',
        'FORM III': 'form-iii',
        'FORM IV': 'form-iv',
      };
      return `/admin/students/registration/${formMap[formLevel]}/year/${year}/stream/${stream}/actions`;
    }
  };

  return (
    <AdminLayout>
      <div className="stream-selection-page-container">
        <div className="stream-selection-card">
          <div className="stream-selection-card-header">
            <i className="fas fa-layer-group"></i>
            <span>
              {formLevel} {year && `- ${year}`} - Select Stream
            </span>
          </div>
          <div className="stream-selection-card-body">
            {isFormVOrVI && formVVIStreams.length === 0 ? (
              <p className="stream-selection-empty">You do not have access to any streams for this form. Contact an administrator.</p>
            ) : (
            <>
              <div className="stream-selection-grid">
                {isFormVOrVI ? (
                  formVVIStreams.map((stream) => (
                    <Link
                      key={stream.code}
                      to={getStreamDetailPath(stream.code)}
                      className="stream-selection-card-item"
                      aria-label={`${stream.name} Stream`}
                    >
                      <div className="stream-selection-name">{stream.name}</div>
                      <div className="stream-selection-code">Stream Code: {stream.code}</div>
                    </Link>
                  ))
                ) : (
                  // FORM I-IV standard streams
                  standardStreams.map((stream) => (
                    <Link
                      key={stream}
                      to={getStreamDetailPath(stream)}
                      className="stream-selection-card-item"
                      aria-label={`Stream ${stream}`}
                    >
                      <div className="stream-selection-name">Stream {stream}</div>
                    </Link>
                  ))
                )}
              </div>
              <Link to={getBackPath()} className="stream-selection-back-btn">
                <i className="fas fa-arrow-left"></i>
                <span>Back</span>
              </Link>
            </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StreamSelection;

