import * as functions from 'firebase-functions';

// Notifications are now handled by the Next.js API route (pages/api/businesses/submit.ts).
// Keep the trigger as a no-op so existing deployments do not send duplicate alerts.
export const notifyBusinessWizard = functions.firestore
  .document('business_wizard/{uid}')
  .onWrite(async (_change, context) => {
    functions.logger.info(
      'notifyBusinessWizard skipped: handled by Next.js API route.',
      { uid: context.params.uid }
    );
    return null;
  });
