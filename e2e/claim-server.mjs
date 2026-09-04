import { spawn } from 'node:child_process';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
  throw new Error('Run via Firebase emulators:exec; production connections are forbidden.');
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', '3100'], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env,
    FIREBASE_SERVICE_ACCOUNT: '', NEXT_PUBLIC_BASE_URL: 'http://localhost:3100',
    OWNERSHIP_CLAIMS_ENABLED: 'true', EMAIL_LINK_AUTH_ENABLED: 'true',
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-claim-e2e',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-claim-e2e.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890', NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:demo',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '', NEXT_PUBLIC_ALGOLIA_APP_ID: '', NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: '',
    EMAIL_USER: '', EMAIL_PASS: '',
  },
});
child.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill());
