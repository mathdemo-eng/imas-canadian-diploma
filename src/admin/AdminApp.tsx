import { Route, Routes } from 'react-router-dom';
import { AdminHome } from './AdminHome';
import { AdminLayout } from './AdminLayout';
import { CollectionPage } from './CollectionPage';
import { FeedbackResultsPage } from './FeedbackResultsPage';
import { PromotionPage } from './PromotionPage';
import { RecordsPage } from './RecordsPage';
import { SettingsPage } from './SettingsPage';
import { StudentDetailPage } from './StudentDetailPage';
import { StudentPreviewPage } from './StudentPreviewPage';
import { StudentsPage } from './StudentsPage';
import { TeachersPage } from './TeachersPage';

/** The staff admin panel, loaded only when someone opens /admin. */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:studentId" element={<StudentDetailPage />} />
        <Route path="students/:studentId/view" element={<StudentPreviewPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="promotion" element={<PromotionPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="feedback" element={<FeedbackResultsPage />} />
        <Route path=":collection" element={<CollectionPage />} />
      </Route>
    </Routes>
  );
}
