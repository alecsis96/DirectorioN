import { ownershipClaimPost } from '../../../../lib/server/ownershipClaimHttp';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }) {
  return ownershipClaimPost(request, (await context.params).operation);
}
