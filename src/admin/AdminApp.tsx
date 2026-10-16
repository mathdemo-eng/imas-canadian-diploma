import { Route, Routes } from 'react-router-dom';
import { AdminHome } from './AdminHome';
import { AdminLayout } from './AdminLayout';
import { CollectionPage } from './CollectionPage';
import { SettingsPage } from './SettingsPage';

/** The staff admin panel, loaded only when someone opens /admin. */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path=":collection" element={<CollectionPage />} />
      </Route>
    </Routes>
  );
}
