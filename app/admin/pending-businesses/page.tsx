import { redirect } from 'next/navigation';
import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';

export default async function PendingBusinessesRedirect() {
  await requireAdminPage('/admin/pending-businesses');
  redirect('/admin/businesses?status=in_review');
}
