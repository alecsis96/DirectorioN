import { signOut } from 'firebase/auth';

import { auth } from '../firebaseConfig';
import { writeSessionCookie } from './sessionCookie';

export async function logoutEverywhereInThisBrowser(): Promise<void> {
  try {
    await signOut(auth);
  } finally {
    await writeSessionCookie();
  }
}
