import { lazy, Suspense, useDeferredValue } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VisitorTracker from './components/VisitorTracker';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Loading from './components/common/Loading';
import logger from './utils/logger';
import './styles/tables-sharp.css';

/** Split modules + legacy `student_registration` for registration routes */
const REGISTRATION_MODULES_FORM_I_IV = ['student_registration_form_i_iv', 'student_registration'];
const REGISTRATION_MODULES_FORM_V_VI = ['student_registration_form_v_vi', 'student_registration'];

// Public Pages (lazy)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const About = lazy(() => import('./pages/public/About'));
const Admissions = lazy(() => import('./pages/public/Admissions'));
const AdmissionsApply = lazy(() => import('./pages/public/AdmissionsApply'));
const Staff = lazy(() => import('./pages/public/Staff'));
const StudentLife = lazy(() => import('./pages/public/StudentLife'));
const StudentReport = lazy(() => import('./pages/public/StudentReport'));
const StudentLogin = lazy(() => import('./pages/public/StudentLogin'));
const StudentDashboard = lazy(() => import('./pages/public/StudentDashboard'));
const PublicFees = lazy(() => import('./pages/public/Fees'));
const Gallery = lazy(() => import('./pages/public/Gallery'));
const Announcements = lazy(() => import('./pages/public/Announcements'));
const NECTAResults = lazy(() => import('./pages/public/NECTAResults'));
const Contact = lazy(() => import('./pages/public/Contact'));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));

// Auth (lazy)
const Login = lazy(() => import('./pages/auth/Login'));

// Admin (lazy)
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSchoolBranding = lazy(() => import('./pages/admin/SchoolBranding'));
const AdminSchoolFee = lazy(() => import('./pages/admin/SchoolFee'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const AdminGallery = lazy(() => import('./pages/admin/Gallery'));
const AdminFAQs = lazy(() => import('./pages/admin/FAQs'));
const AdminAdministrators = lazy(() => import('./pages/admin/Administrators'));
const PublicPages = lazy(() => import('./pages/admin/PublicPages'));
const NECTAUrls = lazy(() => import('./pages/admin/NECTAUrls'));
const AdminDepartmentContacts = lazy(() => import('./pages/admin/DepartmentContacts'));
const AIMatters = lazy(() => import('./pages/admin/AIMatters'));
const AdmissionApplications = lazy(() => import('./pages/admin/AdmissionApplications'));
const StaffProfiles = lazy(() => import('./pages/admin/StaffProfiles'));

// Student Management (lazy)
const StudentRegistration = lazy(() => import('./pages/students/StudentRegistration'));
const YearSelection = lazy(() => import('./pages/students/YearSelection'));
const StreamSelection = lazy(() => import('./pages/students/StreamSelection'));
const FormVVIYearSelection = lazy(() => import('./pages/students/FormVVIYearSelection'));
const ActionSelection = lazy(() => import('./pages/students/ActionSelection'));
const ActionSelectionVVI = lazy(() => import('./pages/students/ActionSelectionVVI'));
const RegistrationForm = lazy(() => import('./pages/students/RegistrationForm'));
const StudentList = lazy(() => import('./pages/students/StudentList'));

// Student Photo (lazy)
const StudentPhoto = lazy(() => import('./pages/students/StudentPhoto'));
const PhotoYearSelection = lazy(() => import('./pages/students/PhotoYearSelection'));
const PhotoStreamSelection = lazy(() => import('./pages/students/PhotoStreamSelection'));
const PhotoFormVVIYearSelection = lazy(() => import('./pages/students/PhotoFormVVIYearSelection'));
const PhotoManagement = lazy(() => import('./pages/students/PhotoManagement'));

// Student Parish (lazy)
const StudentParishes = lazy(() => import('./pages/students/StudentParishes'));
const ParishYearSelection = lazy(() => import('./pages/students/ParishYearSelection'));
const ParishStreamSelection = lazy(() => import('./pages/students/ParishStreamSelection'));
const ParishFormVVIYearSelection = lazy(() => import('./pages/students/ParishFormVVIYearSelection'));
const ParishManagement = lazy(() => import('./pages/students/ParishManagement'));

// Academic (lazy)
const Subjects = lazy(() => import('./pages/academic/Subjects'));
const SubjectsYearSelection = lazy(() => import('./pages/academic/SubjectsYearSelection'));
const SubjectsStreamSelection = lazy(() => import('./pages/academic/SubjectsStreamSelection'));
const SubjectsFormVVIYearSelection = lazy(() => import('./pages/academic/SubjectsFormVVIYearSelection'));
const SubjectsManagement = lazy(() => import('./pages/academic/SubjectsManagement'));
const ScoreEntry = lazy(() => import('./pages/academic/ScoreEntry'));
const ScoreEntryYearSelection = lazy(() => import('./pages/academic/ScoreEntryYearSelection'));
const ScoreEntryStreamSelection = lazy(() => import('./pages/academic/ScoreEntryStreamSelection'));
const DTAMonitor = lazy(() => import('./pages/admin/DTAMonitor'));
const ScoreEntryFormVVIStreamSelection = lazy(() => import('./pages/academic/ScoreEntryFormVVIStreamSelection'));
const ScoreEntryFormVVIYearSelection = lazy(() => import('./pages/academic/ScoreEntryFormVVIYearSelection'));
const ScoreEntrySubjectSelection = lazy(() => import('./pages/academic/ScoreEntrySubjectSelection'));
const ScoreEntryMonthSelection = lazy(() => import('./pages/academic/ScoreEntryMonthSelection'));
const ScoreEntryEnter = lazy(() => import('./pages/academic/ScoreEntryEnter'));
const ScoreEntryFormVVIYearSelectionTogether = lazy(() => import('./pages/academic/ScoreEntryFormVVIYearSelectionTogether'));
const ScoreEntrySubjectSelectionTogether = lazy(() => import('./pages/academic/ScoreEntrySubjectSelectionTogether'));
const ScoreEntryMonthSelectionTogether = lazy(() => import('./pages/academic/ScoreEntryMonthSelectionTogether'));
const Teachers = lazy(() => import('./pages/academic/Teachers'));
const TeachersYearSelection = lazy(() => import('./pages/academic/TeachersYearSelection'));
const TeachersStreamSelection = lazy(() => import('./pages/academic/TeachersStreamSelection'));
const TeachersFormVVIYearSelection = lazy(() => import('./pages/academic/TeachersFormVVIYearSelection'));
const TeachersManagement = lazy(() => import('./pages/academic/TeachersManagement'));
const Grades = lazy(() => import('./pages/academic/Grades'));
const MarksConfig = lazy(() => import('./pages/academic/MarksConfig'));
const MarksConfigYearSelection = lazy(() => import('./pages/academic/MarksConfigYearSelection'));
const MarksConfigStreamSelection = lazy(() => import('./pages/academic/MarksConfigStreamSelection'));
const MarksConfigFormVVIYearSelection = lazy(() => import('./pages/academic/MarksConfigFormVVIYearSelection'));
const MarksConfigTermSelection = lazy(() => import('./pages/academic/MarksConfigTermSelection'));
const MarksConfigStudentSelection = lazy(() => import('./pages/academic/MarksConfigStudentSelection'));
const ComprehensiveStudentMarks = lazy(() => import('./pages/academic/ComprehensiveStudentMarks'));

// Comments & Assessment (lazy)
const Sala = lazy(() => import('./pages/comments/Sala'));
const Huduma = lazy(() => import('./pages/comments/Huduma'));
const Tabia = lazy(() => import('./pages/comments/Tabia'));
const Michezo = lazy(() => import('./pages/comments/Michezo'));
const Taaluma = lazy(() => import('./pages/comments/Taaluma'));
const MwalimuComments = lazy(() => import('./pages/comments/MwalimuComments'));
const MkuuComments = lazy(() => import('./pages/comments/MkuuComments'));
const TabiaMwenendo = lazy(() => import('./pages/comments/TabiaMwenendo'));
const CommentsYearSelection = lazy(() => import('./pages/comments/CommentsYearSelection'));
const CommentsStreamSelection = lazy(() => import('./pages/comments/CommentsStreamSelection'));
const CommentsFormVVIYearSelection = lazy(() => import('./pages/comments/CommentsFormVVIYearSelection'));
const CommentsTermSelection = lazy(() => import('./pages/comments/CommentsTermSelection'));
const CommentsManagement = lazy(() => import('./pages/comments/CommentsManagement'));
const TabiaMwenendoManagement = lazy(() => import('./pages/comments/TabiaMwenendoManagement'));

// Results (lazy)
const MonthlyResults = lazy(() => import('./pages/results/MonthlyResults'));
const MonthlyResultsYearSelection = lazy(() => import('./pages/results/MonthlyResultsYearSelection'));
const MonthlyResultsStreamSelection = lazy(() => import('./pages/results/MonthlyResultsStreamSelection'));
const MonthlyResultsFormVVIYearSelection = lazy(() => import('./pages/results/MonthlyResultsFormVVIYearSelection'));
const MonthlyResultsMonthSelection = lazy(() => import('./pages/results/MonthlyResultsMonthSelection'));
const MonthlyResultsManagement = lazy(() => import('./pages/results/MonthlyResultsManagement'));

// Admin News, Fees, Debts (lazy)
const News = lazy(() => import('./pages/admin/News'));
const Fees = lazy(() => import('./pages/admin/Fees'));
const Debts = lazy(() => import('./pages/admin/Debts'));
const FeesManagement = lazy(() => import('./pages/admin/FeesManagement'));
const DebtsManagement = lazy(() => import('./pages/admin/DebtsManagement'));

// School Branding (lazy)
const Logo = lazy(() => import('./pages/admin/Logo'));
const Stamp = lazy(() => import('./pages/admin/Stamp'));
const Authority = lazy(() => import('./pages/admin/Authority'));
const PassIdManagement = lazy(() => import('./pages/admin/PassIdManagement'));

// Administration (lazy)
const Users = lazy(() => import('./pages/admin/Users'));
const Promotion = lazy(() => import('./pages/admin/Promotion'));
const PromotionSelectClass = lazy(() => import('./pages/admin/PromotionSelectClass'));
const PromotionPreview = lazy(() => import('./pages/admin/PromotionPreview'));
const PreFormOne = lazy(() => import('./pages/admin/PreFormOne'));
const PreFormOneYear = lazy(() => import('./pages/admin/PreFormOneYear'));
const PreFormOneRegistration = lazy(() => import('./pages/admin/PreFormOneRegistration'));
const PreFormOneParishes = lazy(() => import('./pages/admin/PreFormOneParishes'));
const PreFormOneInterviewSubjects = lazy(() => import('./pages/admin/PreFormOneInterviewSubjects'));
const PreFormOneContinuingSubjects = lazy(() => import('./pages/admin/PreFormOneContinuingSubjects'));
const PreFormOneScoreEntry = lazy(() => import('./pages/admin/PreFormOneScoreEntry'));
const PreFormOneInterviewResults = lazy(() => import('./pages/admin/PreFormOneInterviewResults'));
const PreFormOneContinuingResults = lazy(() => import('./pages/admin/PreFormOneContinuingResults'));
const PreFormOneInterviewReports = lazy(() => import('./pages/admin/PreFormOneInterviewReports'));
const PreFormOneContinuingReports = lazy(() => import('./pages/admin/PreFormOneContinuingReports'));
const PreFormOnePromotion = lazy(() => import('./pages/admin/PreFormOnePromotion'));

// Analytics (lazy)
const AnalyticsTrackSelection = lazy(() => import('./pages/analytics/AnalyticsTrackSelection'));
const StudentTrack = lazy(() => import('./pages/analytics/StudentTrack'));
const ClassTrack = lazy(() => import('./pages/analytics/ClassTrack'));
const SubjectTrack = lazy(() => import('./pages/analytics/SubjectTrack'));
const WhoAndWhenTrack = lazy(() => import('./pages/analytics/WhoAndWhenTrack'));
const SolutionsTrack = lazy(() => import('./pages/analytics/SolutionsTrack'));
const AllFormsAverages = lazy(() => import('./pages/analytics/AllFormsAverages'));
const Analytics = lazy(() => import('./pages/analytics/Analytics'));

// Reports (lazy)
const IndividualReport = lazy(() => import('./pages/reports/IndividualReport'));
const IndividualReportYearSelection = lazy(() => import('./pages/reports/IndividualReportYearSelection'));
const IndividualReportTermSelection = lazy(() => import('./pages/reports/IndividualReportTermSelection'));
const IndividualReportStudentSelection = lazy(() => import('./pages/reports/IndividualReportStudentSelection'));
const IndividualReportDetail = lazy(() => import('./pages/reports/IndividualReportDetail'));
const BulkReport = lazy(() => import('./pages/reports/BulkReport'));
const BulkReportYearSelection = lazy(() => import('./pages/reports/BulkReportYearSelection'));
const BulkReportTermSelection = lazy(() => import('./pages/reports/BulkReportTermSelection'));
const BulkReportStreamSelection = lazy(() => import('./pages/reports/BulkReportStreamSelection'));
const BulkReportGenerate = lazy(() => import('./pages/reports/BulkReportGenerate'));

// Shared (not lazy)
import ProtectedRoute from './components/common/ProtectedRoute';
import PageSEO from './components/common/PageSEO';
import SchoolFavicon from './components/common/SchoolFavicon';
import SoundInitializer from './components/common/SoundInitializer';

// Defer route location so lazy components don't suspend during synchronous input (fixes "suspended while responding to synchronous input")
function DeferredRoutes({ children }) {
  const location = useLocation();
  const deferredLocation = useDeferredValue(location);
  return <Routes location={deferredLocation}>{children}</Routes>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SoundInitializer />
        <SocketProvider>
          <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <PageSEO />
          <SchoolFavicon />
          <VisitorTracker />
          <NetworkStatusBanner />
          <Suspense fallback={<Loading minimal message="" />}>
          <DeferredRoutes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<About />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/admissions/apply" element={<AdmissionsApply />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/student-life" element={<StudentLife />} />
            <Route path="/student-report" element={<StudentReport />} />
            <Route path="/student-login" element={<StudentLogin />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/school-fee" element={<PublicFees />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/necta-results" element={<NECTAResults />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/admission-applications"
              element={
                <ProtectedRoute requiredAdmin>
                  <AdmissionApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/school-branding"
              element={
                <ProtectedRoute>
                  <AdminSchoolBranding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/school-fee"
              element={
                <ProtectedRoute>
                  <AdminSchoolFee />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute>
                  <AdminAnnouncements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gallery"
              element={
                <ProtectedRoute>
                  <AdminGallery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/faqs"
              element={
                <ProtectedRoute>
                  <AdminFAQs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/public-pages"
              element={
                <ProtectedRoute>
                  <PublicPages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/necta-urls"
              element={
                <ProtectedRoute>
                  <NECTAUrls />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/administrators"
              element={
                <ProtectedRoute>
                  <AdminAdministrators />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-matters"
              element={
                <ProtectedRoute>
                  <AIMatters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/department-contacts"
              element={
                <ProtectedRoute>
                  <AdminDepartmentContacts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff-profiles"
              element={
                <ProtectedRoute>
                  <StaffProfiles />
                </ProtectedRoute>
              }
            />

            {/* Landing: any split registration module or legacy student_registration */}
            <Route
              path="/admin/students/registration"
              element={
                <ProtectedRoute
                  requiredAnyOfModules={[
                    'student_registration',
                    'student_registration_form_i_iv',
                    'student_registration_form_v_vi',
                  ]}
                >
                  <StudentRegistration />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Routes */}
            <Route
              path="/admin/students/registration/form-i/years"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <YearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-ii/years"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <YearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iii/years"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <YearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iv/years"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <YearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-i/year/:year/streams"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <StreamSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-ii/year/:year/streams"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <StreamSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iii/year/:year/streams"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <StreamSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iv/year/:year/streams"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <StreamSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            {/* Action Selection Routes for Form I-IV */}
            <Route
              path="/admin/students/registration/form-i/year/:year/stream/:stream/actions"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <ActionSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-ii/year/:year/stream/:stream/actions"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <ActionSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iii/year/:year/stream/:stream/actions"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <ActionSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iv/year/:year/stream/:stream/actions"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <ActionSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Routes */}
            <Route
              path="/admin/students/registration/form-v/streams"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <StreamSelection formLevel="FORM V" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-vi/streams"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <StreamSelection formLevel="FORM VI" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-v/stream/:stream/years"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <FormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <FormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            {/* Action Selection Routes for Form V-VI */}
            <Route
              path="/admin/students/registration/form-v/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <CommentsTermSelection formLevel="form-v" moduleName="students" basePath="/admin/students/registration" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-vi/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <CommentsTermSelection formLevel="form-vi" moduleName="students" basePath="/admin/students/registration" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-v/stream/:stream/year/:year/term/:term/actions"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <ActionSelectionVVI formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-vi/stream/:stream/year/:year/term/:term/actions"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <ActionSelectionVVI formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            {/* Registration Form Routes */}
            <Route
              path="/admin/students/registration/form-i/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <RegistrationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-ii/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <RegistrationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iii/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <RegistrationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-iv/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <RegistrationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-v/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <RegistrationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/registration/form-vi/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_V_VI}>
                  <RegistrationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/list"
              element={
                <ProtectedRoute requiredAnyOfModules={REGISTRATION_MODULES_FORM_I_IV}>
                  <StudentList />
                </ProtectedRoute>
              }
            />

            {/* Student Photo Routes */}
            <Route
              path="/admin/students/photos"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <StudentPhoto />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Photo Routes */}
            <Route
              path="/admin/students/photos/form-i/years"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoYearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-ii/years"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoYearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-iii/years"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoYearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-iv/years"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoYearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-i/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoStreamSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-ii/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoStreamSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-iii/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoStreamSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-iv/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoStreamSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-i/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoManagement formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-ii/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoManagement formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-iii/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoManagement formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-iv/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoManagement formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Photo Routes */}
            <Route
              path="/admin/students/photos/form-v/streams"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoStreamSelection formLevel="FORM V" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-vi/streams"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoStreamSelection formLevel="FORM VI" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-v/stream/:stream/years"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoFormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoFormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-v/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <CommentsTermSelection formLevel="form-v" moduleName="students/photos" basePath="/admin/students/photos" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-vi/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <CommentsTermSelection formLevel="form-vi" moduleName="students/photos" basePath="/admin/students/photos" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-v/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoManagement formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/photos/form-vi/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute requiredModule="student_photo">
                  <PhotoManagement formLevel="form-vi" />
                </ProtectedRoute>
              }
            />

            {/* Student Parish Routes */}
            <Route
              path="/admin/students/parishes"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <StudentParishes />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Parish Routes */}
            <Route
              path="/admin/students/parishes/form-i/years"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishYearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-ii/years"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishYearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-iii/years"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishYearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-iv/years"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishYearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-i/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishStreamSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-ii/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishStreamSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-iii/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishStreamSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-iv/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishStreamSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-i/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishManagement formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-ii/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishManagement formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-iii/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishManagement formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-iv/year/:year/stream/:stream"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishManagement formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Parish Routes */}
            <Route
              path="/admin/students/parishes/form-v/streams"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishStreamSelection formLevel="FORM V" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-vi/streams"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishStreamSelection formLevel="FORM VI" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-v/stream/:stream/years"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishFormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishFormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-v/stream/:stream/year/:year"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishManagement formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/parishes/form-vi/stream/:stream/year/:year"
              element={
                <ProtectedRoute requiredModule="student_parishes">
                  <ParishManagement formLevel="form-vi" />
                </ProtectedRoute>
              }
            />

            {/* Academic Management - Subjects Routes (admin only) */}
            <Route
              path="/admin/subjects"
              element={
                <ProtectedRoute requiredAdmin>
                  <Subjects />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Subjects Routes */}
            <Route
              path="/admin/subjects/form-i/years"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsYearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-ii/years"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsYearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-iii/years"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsYearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-iv/years"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsYearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-i/year/:year"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsManagement formLevel="form-i" stream="NA" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-ii/year/:year"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsManagement formLevel="form-ii" stream="NA" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-iii/year/:year"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsManagement formLevel="form-iii" stream="NA" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-iv/year/:year"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsManagement formLevel="form-iv" stream="NA" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Subjects Routes */}
            <Route
              path="/admin/subjects/form-v/streams"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsStreamSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-vi/streams"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsStreamSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-v/stream/:stream/years"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsFormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsFormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-v/stream/:stream/year/:year"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsManagement formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects/form-vi/stream/:stream/year/:year"
              element={
                <ProtectedRoute requiredAdmin>
                  <SubjectsManagement formLevel="form-vi" />
                </ProtectedRoute>
              }
            />

            {/* Academic Management - Score Entry Routes */}
            <Route
              path="/admin/score-entry"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dta-monitor"
              element={
                <ProtectedRoute requiredModule="dta_monitor">
                  <DTAMonitor />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Score Entry Routes */}
            <Route
              path="/admin/score-entry/form-i/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryYearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-ii/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryYearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iii/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryYearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iv/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryYearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-i/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryStreamSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-ii/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryStreamSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iii/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryStreamSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iv/year/:year/streams"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryStreamSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-i/year/:year/stream/:stream/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelection formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-ii/year/:year/stream/:stream/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelection formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iii/year/:year/stream/:stream/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelection formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iv/year/:year/stream/:stream/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelection formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-i/year/:year/stream/:stream/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelection formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-ii/year/:year/stream/:stream/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelection formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iii/year/:year/stream/:stream/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelection formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iv/year/:year/stream/:stream/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelection formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-i/year/:year/stream/:stream/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-ii/year/:year/stream/:stream/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iii/year/:year/stream/:stream/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-iv/year/:year/stream/:stream/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Score Entry Routes */}
            <Route
              path="/admin/score-entry/form-v/streams"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryFormVVIStreamSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-vi/streams"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryFormVVIStreamSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-v/stream/:stream/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryFormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryFormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-v/stream/:stream/year/:year/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelection formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-vi/stream/:stream/year/:year/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelection formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-v/stream/:stream/year/:year/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelection formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-vi/stream/:stream/year/:year/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelection formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-v/stream/:stream/year/:year/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/form-vi/stream/:stream/year/:year/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Together Mode Score Entry Routes */}
            <Route
              path="/admin/score-entry/:formLevel/together/years"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryFormVVIYearSelectionTogether />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/:formLevel/together/year/:year/subjects"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntrySubjectSelectionTogether />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/:formLevel/together/year/:year/subject/:subjectCode/months"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryMonthSelectionTogether />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/score-entry/:formLevel/together/year/:year/subject/:subjectCode/month/:month/enter"
              element={
                <ProtectedRoute requiredModule="individual_scores">
                  <ScoreEntryEnter />
                </ProtectedRoute>
              }
            />
            {/* Academic Management - Teachers Routes */}
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute>
                  <Teachers />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Teachers Routes */}
            <Route
              path="/admin/teachers/form-i/years"
              element={
                <ProtectedRoute>
                  <TeachersYearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-ii/years"
              element={
                <ProtectedRoute>
                  <TeachersYearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-iii/years"
              element={
                <ProtectedRoute>
                  <TeachersYearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-iv/years"
              element={
                <ProtectedRoute>
                  <TeachersYearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-i/year/:year"
              element={
                <ProtectedRoute>
                  <TeachersManagement formLevel="form-i" stream="A" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-ii/year/:year"
              element={
                <ProtectedRoute>
                  <TeachersManagement formLevel="form-ii" stream="A" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-iii/year/:year"
              element={
                <ProtectedRoute>
                  <TeachersManagement formLevel="form-iii" stream="A" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-iv/year/:year"
              element={
                <ProtectedRoute>
                  <TeachersManagement formLevel="form-iv" stream="A" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Teachers Routes */}
            <Route
              path="/admin/teachers/form-v/streams"
              element={
                <ProtectedRoute>
                  <TeachersStreamSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-vi/streams"
              element={
                <ProtectedRoute>
                  <TeachersStreamSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-v/stream/:stream/years"
              element={
                <ProtectedRoute>
                  <TeachersFormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute>
                  <TeachersFormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-v/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute>
                  <CommentsTermSelection formLevel="form-v" moduleName="teachers" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-vi/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute>
                  <CommentsTermSelection formLevel="form-vi" moduleName="teachers" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-v/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute>
                  <TeachersManagement formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers/form-vi/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute>
                  <TeachersManagement formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            {/* Academic Management - Marks Config Routes */}
            <Route
              path="/admin/marks-config"
              element={
                <ProtectedRoute>
                  <MarksConfig />
                </ProtectedRoute>
              }
            />
            {/* FORM I-IV Marks Config Routes */}
            <Route
              path="/admin/marks-config/form-i/years"
              element={
                <ProtectedRoute>
                  <MarksConfigYearSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-ii/years"
              element={
                <ProtectedRoute>
                  <MarksConfigYearSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iii/years"
              element={
                <ProtectedRoute>
                  <MarksConfigYearSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iv/years"
              element={
                <ProtectedRoute>
                  <MarksConfigYearSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-i/year/:year/streams"
              element={
                <ProtectedRoute>
                  <MarksConfigStreamSelection formLevel="FORM I" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-ii/year/:year/streams"
              element={
                <ProtectedRoute>
                  <MarksConfigStreamSelection formLevel="FORM II" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iii/year/:year/streams"
              element={
                <ProtectedRoute>
                  <MarksConfigStreamSelection formLevel="FORM III" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iv/year/:year/streams"
              element={
                <ProtectedRoute>
                  <MarksConfigStreamSelection formLevel="FORM IV" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-i/year/:year/stream/:stream/terms"
              element={
                <ProtectedRoute>
                  <MarksConfigTermSelection formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-ii/year/:year/stream/:stream/terms"
              element={
                <ProtectedRoute>
                  <MarksConfigTermSelection formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iii/year/:year/stream/:stream/terms"
              element={
                <ProtectedRoute>
                  <MarksConfigTermSelection formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iv/year/:year/stream/:stream/terms"
              element={
                <ProtectedRoute>
                  <MarksConfigTermSelection formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-i/year/:year/stream/:stream/term/:term"
              element={
                <ProtectedRoute>
                  <MarksConfigStudentSelection formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-i/year/:year/stream/:stream/term/:term/student/:admNo"
              element={
                <ProtectedRoute>
                  <ComprehensiveStudentMarks formLevel="form-i" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-ii/year/:year/stream/:stream/term/:term"
              element={
                <ProtectedRoute>
                  <MarksConfigStudentSelection formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-ii/year/:year/stream/:stream/term/:term/student/:admNo"
              element={
                <ProtectedRoute>
                  <ComprehensiveStudentMarks formLevel="form-ii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iii/year/:year/stream/:stream/term/:term"
              element={
                <ProtectedRoute>
                  <MarksConfigStudentSelection formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iii/year/:year/stream/:stream/term/:term/student/:admNo"
              element={
                <ProtectedRoute>
                  <ComprehensiveStudentMarks formLevel="form-iii" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iv/year/:year/stream/:stream/term/:term"
              element={
                <ProtectedRoute>
                  <MarksConfigStudentSelection formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-iv/year/:year/stream/:stream/term/:term/student/:admNo"
              element={
                <ProtectedRoute>
                  <ComprehensiveStudentMarks formLevel="form-iv" />
                </ProtectedRoute>
              }
            />
            {/* FORM V-VI Marks Config Routes */}
            <Route
              path="/admin/marks-config/form-v/streams"
              element={
                <ProtectedRoute>
                  <MarksConfigStreamSelection formLevel="FORM V" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-vi/streams"
              element={
                <ProtectedRoute>
                  <MarksConfigStreamSelection formLevel="FORM VI" isFormVOrVI={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-v/stream/:stream/years"
              element={
                <ProtectedRoute>
                  <MarksConfigFormVVIYearSelection formLevel="FORM V" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-vi/stream/:stream/years"
              element={
                <ProtectedRoute>
                  <MarksConfigFormVVIYearSelection formLevel="FORM VI" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-v/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute>
                  <MarksConfigTermSelection formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-vi/stream/:stream/year/:year/terms"
              element={
                <ProtectedRoute>
                  <MarksConfigTermSelection formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-v/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute>
                  <MarksConfigStudentSelection formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-v/stream/:stream/year/:year/term/:term/student/:admNo"
              element={
                <ProtectedRoute>
                  <ComprehensiveStudentMarks formLevel="form-v" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-vi/stream/:stream/year/:year/term/:term"
              element={
                <ProtectedRoute>
                  <MarksConfigStudentSelection formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marks-config/form-vi/stream/:stream/year/:year/term/:term/student/:admNo"
              element={
                <ProtectedRoute>
                  <ComprehensiveStudentMarks formLevel="form-vi" />
                </ProtectedRoute>
              }
            />
            {/* Academic Management - Other Routes */}
            <Route
              path="/admin/grades"
              element={
                <ProtectedRoute>
                  <Grades />
                </ProtectedRoute>
              }
            />

            {/* Comments & Assessment Routes */}
            {/* Sala Comments */}
            <Route path="/admin/sala" element={<ProtectedRoute requiredModule="sala_comments"><Sala /></ProtectedRoute>} />
            <Route path="/admin/sala/form-i/years" element={<ProtectedRoute requiredModule="sala_comments"><CommentsYearSelection formLevel="FORM I" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-ii/years" element={<ProtectedRoute requiredModule="sala_comments"><CommentsYearSelection formLevel="FORM II" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iii/years" element={<ProtectedRoute requiredModule="sala_comments"><CommentsYearSelection formLevel="FORM III" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iv/years" element={<ProtectedRoute requiredModule="sala_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-v/streams" element={<ProtectedRoute requiredModule="sala_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="sala" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/sala/form-vi/streams" element={<ProtectedRoute requiredModule="sala_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="sala" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/sala/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="sala_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="sala_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="sala_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="sala_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="sala_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="sala_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="sala_comments"><CommentsTermSelection formLevel="form-i" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="sala_comments"><CommentsTermSelection formLevel="form-ii" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="sala_comments"><CommentsTermSelection formLevel="form-iii" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="sala_comments"><CommentsTermSelection formLevel="form-iv" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="sala_comments"><CommentsTermSelection formLevel="form-v" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="sala_comments"><CommentsTermSelection formLevel="form-vi" moduleName="sala" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="sala_comments"><CommentsManagement formLevel="form-i" moduleName="sala" commentType="sala" moduleLabel="Sala Comments" icon="fa-comments" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="sala_comments"><CommentsManagement formLevel="form-ii" moduleName="sala" commentType="sala" moduleLabel="Sala Comments" icon="fa-comments" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="sala_comments"><CommentsManagement formLevel="form-iii" moduleName="sala" commentType="sala" moduleLabel="Sala Comments" icon="fa-comments" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="sala_comments"><CommentsManagement formLevel="form-iv" moduleName="sala" commentType="sala" moduleLabel="Sala Comments" icon="fa-comments" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="sala_comments"><CommentsManagement formLevel="form-v" moduleName="sala" commentType="sala" moduleLabel="Sala Comments" icon="fa-comments" /></ProtectedRoute>} />
            <Route path="/admin/sala/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="sala_comments"><CommentsManagement formLevel="form-vi" moduleName="sala" commentType="sala" moduleLabel="Sala Comments" icon="fa-comments" /></ProtectedRoute>} />

            {/* Huduma Comments */}
            <Route path="/admin/huduma" element={<ProtectedRoute requiredModule="huduma_comments"><Huduma /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-i/years" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsYearSelection formLevel="FORM I" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-ii/years" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsYearSelection formLevel="FORM II" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iii/years" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsYearSelection formLevel="FORM III" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iv/years" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-v/streams" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="huduma" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-vi/streams" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="huduma" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsTermSelection formLevel="form-i" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsTermSelection formLevel="form-ii" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsTermSelection formLevel="form-iii" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsTermSelection formLevel="form-iv" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsTermSelection formLevel="form-v" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsTermSelection formLevel="form-vi" moduleName="huduma" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsManagement formLevel="form-i" moduleName="huduma" commentType="huduma" moduleLabel="Huduma Comments" icon="fa-hands-helping" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsManagement formLevel="form-ii" moduleName="huduma" commentType="huduma" moduleLabel="Huduma Comments" icon="fa-hands-helping" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsManagement formLevel="form-iii" moduleName="huduma" commentType="huduma" moduleLabel="Huduma Comments" icon="fa-hands-helping" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsManagement formLevel="form-iv" moduleName="huduma" commentType="huduma" moduleLabel="Huduma Comments" icon="fa-hands-helping" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsManagement formLevel="form-v" moduleName="huduma" commentType="huduma" moduleLabel="Huduma Comments" icon="fa-hands-helping" /></ProtectedRoute>} />
            <Route path="/admin/huduma/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="huduma_comments"><CommentsManagement formLevel="form-vi" moduleName="huduma" commentType="huduma" moduleLabel="Huduma Comments" icon="fa-hands-helping" /></ProtectedRoute>} />

            {/* Tabia Comments */}
            <Route path="/admin/tabia" element={<ProtectedRoute requiredModule="tabia_comments"><Tabia /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-i/years" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsYearSelection formLevel="FORM I" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-ii/years" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsYearSelection formLevel="FORM II" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iii/years" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsYearSelection formLevel="FORM III" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iv/years" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-v/streams" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="tabia" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-vi/streams" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="tabia" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsTermSelection formLevel="form-i" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsTermSelection formLevel="form-ii" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsTermSelection formLevel="form-iii" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsTermSelection formLevel="form-iv" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsTermSelection formLevel="form-v" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsTermSelection formLevel="form-vi" moduleName="tabia" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsManagement formLevel="form-i" moduleName="tabia" commentType="tabia" moduleLabel="Tabia Comments" icon="fa-user-check" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsManagement formLevel="form-ii" moduleName="tabia" commentType="tabia" moduleLabel="Tabia Comments" icon="fa-user-check" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsManagement formLevel="form-iii" moduleName="tabia" commentType="tabia" moduleLabel="Tabia Comments" icon="fa-user-check" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsManagement formLevel="form-iv" moduleName="tabia" commentType="tabia" moduleLabel="Tabia Comments" icon="fa-user-check" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsManagement formLevel="form-v" moduleName="tabia" commentType="tabia" moduleLabel="Tabia Comments" icon="fa-user-check" /></ProtectedRoute>} />
            <Route path="/admin/tabia/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="tabia_comments"><CommentsManagement formLevel="form-vi" moduleName="tabia" commentType="tabia" moduleLabel="Tabia Comments" icon="fa-user-check" /></ProtectedRoute>} />

            {/* Michezo Comments */}
            <Route path="/admin/michezo" element={<ProtectedRoute requiredModule="michezo_comments"><Michezo /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-i/years" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsYearSelection formLevel="FORM I" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-ii/years" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsYearSelection formLevel="FORM II" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iii/years" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsYearSelection formLevel="FORM III" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iv/years" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-v/streams" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="michezo" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-vi/streams" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="michezo" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsTermSelection formLevel="form-i" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsTermSelection formLevel="form-ii" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsTermSelection formLevel="form-iii" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsTermSelection formLevel="form-iv" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsTermSelection formLevel="form-v" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsTermSelection formLevel="form-vi" moduleName="michezo" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsManagement formLevel="form-i" moduleName="michezo" commentType="michezo" moduleLabel="Michezo Comments" icon="fa-running" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsManagement formLevel="form-ii" moduleName="michezo" commentType="michezo" moduleLabel="Michezo Comments" icon="fa-running" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsManagement formLevel="form-iii" moduleName="michezo" commentType="michezo" moduleLabel="Michezo Comments" icon="fa-running" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsManagement formLevel="form-iv" moduleName="michezo" commentType="michezo" moduleLabel="Michezo Comments" icon="fa-running" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsManagement formLevel="form-v" moduleName="michezo" commentType="michezo" moduleLabel="Michezo Comments" icon="fa-running" /></ProtectedRoute>} />
            <Route path="/admin/michezo/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="michezo_comments"><CommentsManagement formLevel="form-vi" moduleName="michezo" commentType="michezo" moduleLabel="Michezo Comments" icon="fa-running" /></ProtectedRoute>} />

            {/* Taaluma Comments */}
            <Route path="/admin/taaluma" element={<ProtectedRoute requiredModule="taaluma_comments"><Taaluma /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-i/years" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsYearSelection formLevel="FORM I" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-ii/years" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsYearSelection formLevel="FORM II" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iii/years" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsYearSelection formLevel="FORM III" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iv/years" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-v/streams" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="taaluma" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-vi/streams" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="taaluma" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsTermSelection formLevel="form-i" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsTermSelection formLevel="form-ii" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsTermSelection formLevel="form-iii" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsTermSelection formLevel="form-iv" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsTermSelection formLevel="form-v" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsTermSelection formLevel="form-vi" moduleName="taaluma" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsManagement formLevel="form-i" moduleName="taaluma" commentType="taaluma" moduleLabel="Taaluma Comments" icon="fa-book-open" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsManagement formLevel="form-ii" moduleName="taaluma" commentType="taaluma" moduleLabel="Taaluma Comments" icon="fa-book-open" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsManagement formLevel="form-iii" moduleName="taaluma" commentType="taaluma" moduleLabel="Taaluma Comments" icon="fa-book-open" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsManagement formLevel="form-iv" moduleName="taaluma" commentType="taaluma" moduleLabel="Taaluma Comments" icon="fa-book-open" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsManagement formLevel="form-v" moduleName="taaluma" commentType="taaluma" moduleLabel="Taaluma Comments" icon="fa-book-open" /></ProtectedRoute>} />
            <Route path="/admin/taaluma/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="taaluma_comments"><CommentsManagement formLevel="form-vi" moduleName="taaluma" commentType="taaluma" moduleLabel="Taaluma Comments" icon="fa-book-open" /></ProtectedRoute>} />

            {/* Mwalimu Comments */}
            <Route path="/admin/mwalimu-comments" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><MwalimuComments /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-i/years" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsYearSelection formLevel="FORM I" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-ii/years" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsYearSelection formLevel="FORM II" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iii/years" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsYearSelection formLevel="FORM III" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iv/years" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-v/streams" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="mwalimu-comments" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-vi/streams" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="mwalimu-comments" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsTermSelection formLevel="form-i" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsTermSelection formLevel="form-ii" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsTermSelection formLevel="form-iii" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsTermSelection formLevel="form-iv" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsTermSelection formLevel="form-v" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsTermSelection formLevel="form-vi" moduleName="mwalimu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsManagement formLevel="form-i" moduleName="mwalimu-comments" commentType="mwalimu_taaluma" moduleLabel="Mwalimu Comments" icon="fa-user-graduate" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsManagement formLevel="form-ii" moduleName="mwalimu-comments" commentType="mwalimu_taaluma" moduleLabel="Mwalimu Comments" icon="fa-user-graduate" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsManagement formLevel="form-iii" moduleName="mwalimu-comments" commentType="mwalimu_taaluma" moduleLabel="Mwalimu Comments" icon="fa-user-graduate" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsManagement formLevel="form-iv" moduleName="mwalimu-comments" commentType="mwalimu_taaluma" moduleLabel="Mwalimu Comments" icon="fa-user-graduate" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsManagement formLevel="form-v" moduleName="mwalimu-comments" commentType="mwalimu_taaluma" moduleLabel="Mwalimu Comments" icon="fa-user-graduate" /></ProtectedRoute>} />
            <Route path="/admin/mwalimu-comments/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="mwalimu_taaluma_comments"><CommentsManagement formLevel="form-vi" moduleName="mwalimu-comments" commentType="mwalimu_taaluma" moduleLabel="Mwalimu Comments" icon="fa-user-graduate" /></ProtectedRoute>} />

            {/* Mkuu Comments */}
            <Route path="/admin/mkuu-comments" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><MkuuComments /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-i/years" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsYearSelection formLevel="FORM I" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-ii/years" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsYearSelection formLevel="FORM II" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iii/years" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsYearSelection formLevel="FORM III" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iv/years" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-v/streams" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="mkuu-comments" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-vi/streams" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="mkuu-comments" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsTermSelection formLevel="form-i" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsTermSelection formLevel="form-ii" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsTermSelection formLevel="form-iii" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsTermSelection formLevel="form-iv" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsTermSelection formLevel="form-v" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsTermSelection formLevel="form-vi" moduleName="mkuu-comments" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsManagement formLevel="form-i" moduleName="mkuu-comments" commentType="mkuu_shule" moduleLabel="Mkuu Comments" icon="fa-crown" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsManagement formLevel="form-ii" moduleName="mkuu-comments" commentType="mkuu_shule" moduleLabel="Mkuu Comments" icon="fa-crown" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsManagement formLevel="form-iii" moduleName="mkuu-comments" commentType="mkuu_shule" moduleLabel="Mkuu Comments" icon="fa-crown" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsManagement formLevel="form-iv" moduleName="mkuu-comments" commentType="mkuu_shule" moduleLabel="Mkuu Comments" icon="fa-crown" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsManagement formLevel="form-v" moduleName="mkuu-comments" commentType="mkuu_shule" moduleLabel="Mkuu Comments" icon="fa-crown" /></ProtectedRoute>} />
            <Route path="/admin/mkuu-comments/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="mkuu_shule_comments"><CommentsManagement formLevel="form-vi" moduleName="mkuu-comments" commentType="mkuu_shule" moduleLabel="Mkuu Comments" icon="fa-crown" /></ProtectedRoute>} />

            {/* Tabia & Mwenendo */}
            <Route path="/admin/tabia-mwenendo" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendo /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-i/years" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsYearSelection formLevel="FORM I" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-ii/years" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsYearSelection formLevel="FORM II" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iii/years" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsYearSelection formLevel="FORM III" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iv/years" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsYearSelection formLevel="FORM IV" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-v/streams" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsStreamSelection formLevel="FORM V" moduleName="tabia-mwenendo" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-vi/streams" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsStreamSelection formLevel="FORM VI" moduleName="tabia-mwenendo" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsStreamSelection formLevel="FORM I" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsStreamSelection formLevel="FORM II" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsStreamSelection formLevel="FORM III" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsStreamSelection formLevel="FORM IV" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsTermSelection formLevel="form-i" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsTermSelection formLevel="form-ii" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsTermSelection formLevel="form-iii" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsTermSelection formLevel="form-iv" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsTermSelection formLevel="form-v" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><CommentsTermSelection formLevel="form-vi" moduleName="tabia-mwenendo" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendoManagement formLevel="form-i" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendoManagement formLevel="form-ii" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendoManagement formLevel="form-iii" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendoManagement formLevel="form-iv" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendoManagement formLevel="form-v" /></ProtectedRoute>} />
            <Route path="/admin/tabia-mwenendo/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="tabia_mwenendo_comments"><TabiaMwenendoManagement formLevel="form-vi" /></ProtectedRoute>} />

            {/* Results & Reports Routes */}
            {/* Monthly Results */}
            <Route path="/admin/results/monthly" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResults /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-i/years" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsYearSelection formLevel="FORM I" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-ii/years" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsYearSelection formLevel="FORM II" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iii/years" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsYearSelection formLevel="FORM III" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iv/years" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsYearSelection formLevel="FORM IV" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-v/streams" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsStreamSelection formLevel="FORM V" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-vi/streams" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsStreamSelection formLevel="FORM VI" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsFormVVIYearSelection formLevel="FORM V" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsFormVVIYearSelection formLevel="FORM VI" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsStreamSelection formLevel="FORM I" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsStreamSelection formLevel="FORM II" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsStreamSelection formLevel="FORM III" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsStreamSelection formLevel="FORM IV" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-i/year/:year/stream/:stream/months" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsMonthSelection formLevel="form-i" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-ii/year/:year/stream/:stream/months" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsMonthSelection formLevel="form-ii" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iii/year/:year/stream/:stream/months" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsMonthSelection formLevel="form-iii" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iv/year/:year/stream/:stream/months" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsMonthSelection formLevel="form-iv" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-v/stream/:stream/year/:year/months" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsMonthSelection formLevel="form-v" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-vi/stream/:stream/year/:year/months" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsMonthSelection formLevel="form-vi" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-i/year/:year/stream/:stream/month/:month" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsManagement formLevel="form-i" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-ii/year/:year/stream/:stream/month/:month" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsManagement formLevel="form-ii" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iii/year/:year/stream/:stream/month/:month" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsManagement formLevel="form-iii" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-iv/year/:year/stream/:stream/month/:month" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsManagement formLevel="form-iv" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-v/stream/:stream/year/:year/month/:month" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsManagement formLevel="form-v" /></ProtectedRoute>} />
            <Route path="/admin/results/monthly/form-vi/stream/:stream/year/:year/month/:month" element={<ProtectedRoute requiredModule="monthly_results"><MonthlyResultsManagement formLevel="form-vi" /></ProtectedRoute>} />

            <Route
              path="/reports/individual"
              element={
                <ProtectedRoute requiredModule="individual_report">
                  <IndividualReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/individual/:form/stream"
              element={
                <ProtectedRoute requiredModule="individual_report">
                  <IndividualReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/individual/:form/:stream/year"
              element={
                <ProtectedRoute requiredModule="individual_report">
                  <IndividualReportYearSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/individual/:form/:stream/:year/term"
              element={
                <ProtectedRoute requiredModule="individual_report">
                  <IndividualReportTermSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/individual/:form/:stream/:year/:term/students"
              element={
                <ProtectedRoute requiredModule="individual_report">
                  <IndividualReportStudentSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/individual/:form/:stream/:year/:term/:admNo"
              element={
                <ProtectedRoute requiredModule="individual_report">
                  <IndividualReportDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/bulk"
              element={
                <ProtectedRoute requiredModule="bulk_report">
                  <BulkReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/bulk/:form/stream"
              element={
                <ProtectedRoute requiredModule="bulk_report">
                  <BulkReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/bulk/:form/:stream/year"
              element={
                <ProtectedRoute requiredModule="bulk_report">
                  <BulkReportYearSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/bulk/:form/:stream/:year/term"
              element={
                <ProtectedRoute requiredModule="bulk_report">
                  <BulkReportTermSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/bulk/:form/:stream/:year/:term/stream"
              element={
                <ProtectedRoute requiredModule="bulk_report">
                  <BulkReportStreamSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/bulk/:form/:stream/:year/:term/generate"
              element={
                <ProtectedRoute requiredModule="bulk_report">
                  <BulkReportGenerate />
                </ProtectedRoute>
              }
            />
            {/* Analytics Routes */}
            <Route path="/admin/analytics" element={<ProtectedRoute requiredModule="analytics_view"><Analytics /></ProtectedRoute>} />
            <Route path="/admin/analytics/all-forms-averages" element={<ProtectedRoute requiredModule="analytics_form_averages"><AllFormsAverages /></ProtectedRoute>} />
            <Route path="/admin/analytics/:form" element={<ProtectedRoute requiredModule="analytics_view"><AnalyticsTrackSelection /></ProtectedRoute>} />
            <Route path="/admin/analytics/:form/student-track" element={<ProtectedRoute requiredModule="analytics_student_tracking"><StudentTrack /></ProtectedRoute>} />
            <Route path="/admin/analytics/:form/class-track" element={<ProtectedRoute requiredModule="analytics_student_tracking"><ClassTrack /></ProtectedRoute>} />
            <Route path="/admin/analytics/:form/subject-track" element={<ProtectedRoute requiredModule="analytics_student_tracking"><SubjectTrack /></ProtectedRoute>} />
            <Route path="/admin/analytics/:form/who-and-when" element={<ProtectedRoute requiredModule="analytics_student_tracking"><WhoAndWhenTrack /></ProtectedRoute>} />
            <Route path="/admin/analytics/:form/solutions" element={<ProtectedRoute requiredModule="analytics_solutions"><SolutionsTrack /></ProtectedRoute>} />

            {/* Announcements & Communication Routes */}
            {/* News */}
            <Route path="/admin/news" element={<ProtectedRoute requiredModule="news_announcements"><News /></ProtectedRoute>} />

            {/* Fees Announcements */}
            <Route path="/admin/fees" element={<ProtectedRoute requiredModule="fees_announcements"><Fees /></ProtectedRoute>} />
            <Route path="/admin/fees/form-i/years" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsYearSelection formLevel="FORM I" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-ii/years" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsYearSelection formLevel="FORM II" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iii/years" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsYearSelection formLevel="FORM III" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iv/years" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsYearSelection formLevel="FORM IV" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-v/streams" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsStreamSelection formLevel="FORM V" moduleName="fees" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/fees/form-vi/streams" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsStreamSelection formLevel="FORM VI" moduleName="fees" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/fees/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsStreamSelection formLevel="FORM I" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsStreamSelection formLevel="FORM II" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsStreamSelection formLevel="FORM III" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsStreamSelection formLevel="FORM IV" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-i/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsTermSelection formLevel="form-i" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-ii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsTermSelection formLevel="form-ii" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iii/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsTermSelection formLevel="form-iii" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iv/year/:year/stream/:stream/terms" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsTermSelection formLevel="form-iv" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-i/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="fees_announcements"><FeesManagement formLevel="form-i" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-ii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="fees_announcements"><FeesManagement formLevel="form-ii" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iii/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="fees_announcements"><FeesManagement formLevel="form-iii" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-iv/year/:year/stream/:stream/term/:term" element={<ProtectedRoute requiredModule="fees_announcements"><FeesManagement formLevel="form-iv" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsTermSelection formLevel="form-v" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="fees_announcements"><CommentsTermSelection formLevel="form-vi" moduleName="fees" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="fees_announcements"><FeesManagement formLevel="form-v" /></ProtectedRoute>} />
            <Route path="/admin/fees/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="fees_announcements"><FeesManagement formLevel="form-vi" /></ProtectedRoute>} />

            {/* Individual Debt */}
            <Route path="/admin/debts" element={<ProtectedRoute requiredModule="individual_debt"><Debts /></ProtectedRoute>} />
            <Route path="/admin/debts/form-i/years" element={<ProtectedRoute requiredModule="individual_debt"><CommentsYearSelection formLevel="FORM I" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-ii/years" element={<ProtectedRoute requiredModule="individual_debt"><CommentsYearSelection formLevel="FORM II" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-iii/years" element={<ProtectedRoute requiredModule="individual_debt"><CommentsYearSelection formLevel="FORM III" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-iv/years" element={<ProtectedRoute requiredModule="individual_debt"><CommentsYearSelection formLevel="FORM IV" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-v/streams" element={<ProtectedRoute requiredModule="individual_debt"><CommentsStreamSelection formLevel="FORM V" moduleName="debts" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/debts/form-vi/streams" element={<ProtectedRoute requiredModule="individual_debt"><CommentsStreamSelection formLevel="FORM VI" moduleName="debts" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/debts/form-v/stream/:stream/years" element={<ProtectedRoute requiredModule="individual_debt"><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-vi/stream/:stream/years" element={<ProtectedRoute requiredModule="individual_debt"><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-v/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="individual_debt"><CommentsTermSelection formLevel="form-v" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-vi/stream/:stream/year/:year/terms" element={<ProtectedRoute requiredModule="individual_debt"><CommentsTermSelection formLevel="form-vi" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-i/year/:year/streams" element={<ProtectedRoute requiredModule="individual_debt"><CommentsStreamSelection formLevel="FORM I" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-ii/year/:year/streams" element={<ProtectedRoute requiredModule="individual_debt"><CommentsStreamSelection formLevel="FORM II" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-iii/year/:year/streams" element={<ProtectedRoute requiredModule="individual_debt"><CommentsStreamSelection formLevel="FORM III" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-iv/year/:year/streams" element={<ProtectedRoute requiredModule="individual_debt"><CommentsStreamSelection formLevel="FORM IV" moduleName="debts" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-i/year/:year/stream/:stream" element={<ProtectedRoute requiredModule="individual_debt"><DebtsManagement formLevel="form-i" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-ii/year/:year/stream/:stream" element={<ProtectedRoute requiredModule="individual_debt"><DebtsManagement formLevel="form-ii" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-iii/year/:year/stream/:stream" element={<ProtectedRoute requiredModule="individual_debt"><DebtsManagement formLevel="form-iii" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-iv/year/:year/stream/:stream" element={<ProtectedRoute requiredModule="individual_debt"><DebtsManagement formLevel="form-iv" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-v/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="individual_debt"><DebtsManagement formLevel="form-v" /></ProtectedRoute>} />
            <Route path="/admin/debts/form-vi/stream/:stream/year/:year/term/:term" element={<ProtectedRoute requiredModule="individual_debt"><DebtsManagement formLevel="form-vi" /></ProtectedRoute>} />

            {/* School Branding Routes */}
            <Route path="/admin/branding/logo" element={<ProtectedRoute requiredAdmin={true}><Logo /></ProtectedRoute>} />
            <Route path="/admin/branding/stamp" element={<ProtectedRoute><Stamp /></ProtectedRoute>} />
            <Route path="/admin/branding/authority" element={<ProtectedRoute><Authority /></ProtectedRoute>} />
            <Route path="/admin/pass-ids" element={<ProtectedRoute><PassIdManagement /></ProtectedRoute>} />
            <Route path="/admin/pass-ids/:form" element={<ProtectedRoute><PassIdManagement /></ProtectedRoute>} />

            {/* Administration Routes */}
            {/* User Management */}
            <Route path="/admin/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            

            {/* Student Promotion */}
            <Route path="/admin/promotion" element={<ProtectedRoute><Promotion /></ProtectedRoute>} />
            <Route path="/admin/promotion/select-class" element={<ProtectedRoute><PromotionSelectClass /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-i/years" element={<ProtectedRoute><CommentsYearSelection formLevel="FORM I" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-ii/years" element={<ProtectedRoute><CommentsYearSelection formLevel="FORM II" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-iii/years" element={<ProtectedRoute><CommentsYearSelection formLevel="FORM III" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-iv/years" element={<ProtectedRoute><CommentsYearSelection formLevel="FORM IV" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-v/streams" element={<ProtectedRoute><CommentsStreamSelection formLevel="FORM V" moduleName="promotion" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-vi/streams" element={<ProtectedRoute><CommentsStreamSelection formLevel="FORM VI" moduleName="promotion" isFormVOrVI={true} /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-v/stream/:stream/years" element={<ProtectedRoute><CommentsFormVVIYearSelection formLevel="FORM V" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-vi/stream/:stream/years" element={<ProtectedRoute><CommentsFormVVIYearSelection formLevel="FORM VI" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-i/year/:year/streams" element={<ProtectedRoute><CommentsStreamSelection formLevel="FORM I" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-ii/year/:year/streams" element={<ProtectedRoute><CommentsStreamSelection formLevel="FORM II" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-iii/year/:year/streams" element={<ProtectedRoute><CommentsStreamSelection formLevel="FORM III" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-iv/year/:year/streams" element={<ProtectedRoute><CommentsStreamSelection formLevel="FORM IV" moduleName="promotion" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-i/year/:year/stream/:stream/preview" element={<ProtectedRoute><PromotionPreview formLevel="form-i" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-ii/year/:year/stream/:stream/preview" element={<ProtectedRoute><PromotionPreview formLevel="form-ii" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-iii/year/:year/stream/:stream/preview" element={<ProtectedRoute><PromotionPreview formLevel="form-iii" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-iv/year/:year/stream/:stream/preview" element={<ProtectedRoute><PromotionPreview formLevel="form-iv" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-v/stream/:stream/year/:year/preview" element={<ProtectedRoute><PromotionPreview formLevel="form-v" /></ProtectedRoute>} />
            <Route path="/admin/promotion/form-vi/stream/:stream/year/:year/preview" element={<ProtectedRoute><PromotionPreview formLevel="form-vi" /></ProtectedRoute>} />

            {/* Pre-Form One */}
            <Route path="/admin/pre-form-one" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOne /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneYear /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/registration" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneRegistration /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/parishes" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneParishes /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/interview-subjects" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneInterviewSubjects /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/continuing-subjects" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneContinuingSubjects /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/score-entry" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneScoreEntry /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/score-entry/:subjectId" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneScoreEntry /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/interview-results" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneInterviewResults /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/continuing-results" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneContinuingResults /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/interview-reports" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneInterviewReports /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/continuing-reports" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOneContinuingReports /></ProtectedRoute>} />
            <Route path="/admin/pre-form-one/:year/promotion" element={<ProtectedRoute requiredModule="student_registration_pre_form"><PreFormOnePromotion /></ProtectedRoute>} />

            {/* Public Website Routes */}
            <Route path="/admin/gallery" element={<ProtectedRoute><AdminGallery /></ProtectedRoute>} />
            <Route path="/admin/faqs" element={<ProtectedRoute><AdminFAQs /></ProtectedRoute>} />
            <Route path="/admin/ai-matters" element={<ProtectedRoute><AIMatters /></ProtectedRoute>} />
            <Route path="/admin/department-contacts" element={<ProtectedRoute><AdminDepartmentContacts /></ProtectedRoute>} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </DeferredRoutes>
          </Suspense>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;


