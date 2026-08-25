import { redirect } from 'next/navigation';

import NegociosAlgoliaClient from '../../components/NegociosAlgoliaClient';
import { isAlgoliaPublicRouteEnabled } from '../../lib/algoliaRoute';

export default function NegociosAlgoliaPage() {
  if (!isAlgoliaPublicRouteEnabled()) {
    redirect('/negocios');
  }

  return <NegociosAlgoliaClient />;
}
