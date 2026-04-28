/**
 * Monthly Results Stream Selection Page
 */
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import '../academic/SubjectsStreamSelection.css';

const MonthlyResultsStreamSelection = ({ formLevel, isFormVOrVI = false }) => {
  const { year } = useParams();
  const [searchParams] = useSearchParams();
  const isCombined = searchParams.get('combined') === '1';
  
  const standardStreams = ['A', 'B'];
  
  const formVVIStreams = [
    { code: 'PCB', name: 'Physics, Chemistry, Biology' },
    { code: 'PCM', name: 'Physics, Chemistry, Mathematics' },
    { code: 'CBG', name: 'Chemistry, Biology, Geography' },
    { code: 'HGL', name: 'History, Geography, Literature' },
    { code: 'HKL', name: 'History, Kiswahili, Literature' },
    { code: 'EGM', name: 'Economics, Geography, Mathematics' },
    { code: 'HGE', name: 'History, Geography, Economics' },
    { code: 'PGM', name: 'Physics, Geography, Advanced Mathematics' },
  ];

  const getBackPath = () => {
    if (isFormVOrVI) {
      return '/admin/results/monthly';
    }
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/results/monthly/${formMap[formLevel]}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      const formMap = {
        'FORM V': 'form-v',
        'FORM VI': 'form-vi',
      };
      return `/admin/results/monthly/${formMap[formLevel]}/stream/${stream}/years`;
    } else {
      const formMap = {
        'FORM I': 'form-i',
        'FORM II': 'form-ii',
        'FORM III': 'form-iii',
        'FORM IV': 'form-iv',
      };
      return `/admin/results/monthly/${formMap[formLevel]}/year/${year}/stream/${stream}/months`;
    }
  };

  const streams = isFormVOrVI ? formVVIStreams : standardStreams;

  const combinedMessage = formLevel === 'FORM V'
    ? 'CLICK HERE TO SEE RESULTS OF ALL FORM FIVE STREAM IN ONE PAPER'
    : 'CLICK HERE TO SEE RESULTS OF ALL FORM SIX STREAM IN ONE PAPER';

  const getCombinedYearSelectionPath = () => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/results/monthly/${formMap[formLevel]}/stream/all/years?combined=1`;
  };

  return (
    <AdminLayout>
      <div className="subjects-stream-selection-page-container">
        <div className="subjects-stream-selection-card">
          <div className="subjects-stream-selection-card-header">
            <i className="fas fa-stream"></i>
            {formLevel} {year && !isFormVOrVI ? year : ''} - Select Stream
          </div>
          <div className="subjects-stream-selection-card-body">
            {isCombined && isFormVOrVI ? (
              <Link
                to={getCombinedYearSelectionPath()}
                className="subjects-stream-selection-combined-card"
              >
                <div className="subjects-stream-selection-combined-text">{combinedMessage}</div>
              </Link>
            ) : (
              <div className="subjects-stream-selection-grid">
                {streams.map((stream) => {
                  const streamCode = typeof stream === 'string' ? stream : stream.code;
                  const streamName = typeof stream === 'string' ? `Stream ${stream}` : stream.name;
                  return (
                    <Link
                      key={streamCode}
                      to={getStreamDetailPath(streamCode)}
                      className="subjects-stream-selection-card-item"
                    >
                      <div className="subjects-stream-selection-name">{streamName}</div>
                      {typeof stream === 'object' && (
                        <div className="subjects-stream-selection-code">Stream Code: {streamCode}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
            <Link to={getBackPath()} className="subjects-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MonthlyResultsStreamSelection;

