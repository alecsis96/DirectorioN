import {
  approveApplicationV2Transaction,
  reissueOwnershipInvitationV2Transaction,
  type ApplicationV2ApprovalOptions,
} from './applicationV2Approval';
import {
  deliverOwnershipInvitation,
  type InvitationDeliveryOptions,
} from './ownershipInvitationDelivery';

type WorkflowOptions = ApplicationV2ApprovalOptions & InvitationDeliveryOptions;

export type SafeApplicationV2ApprovalResult = {
  ok: true;
  created: boolean;
  applicationId: string;
  businessId: string;
  invitationStatus: 'pending' | 'delivered' | 'failed';
};

async function deliverPreparedInvitation(
  result: Awaited<ReturnType<typeof approveApplicationV2Transaction>>,
  options: WorkflowOptions,
): Promise<SafeApplicationV2ApprovalResult> {
  let invitationStatus = result.invitationStatus;
  if (result.token && result.claimId && result.outboxId) {
    const delivery = await deliverOwnershipInvitation(
      {
        applicationId: result.applicationId,
        businessId: result.businessId,
        claimId: result.claimId,
        outboxId: result.outboxId,
        token: result.token,
      },
      options,
    );
    invitationStatus = delivery.status;
  }

  // Nunca devolver el token ni el claimId a Client Components o API responses.
  return {
    ok: true,
    created: result.created,
    applicationId: result.applicationId,
    businessId: result.businessId,
    invitationStatus,
  };
}

export async function approveAndDeliverApplicationV2(
  applicationId: string,
  approvedBy: string,
  options: WorkflowOptions = {},
): Promise<SafeApplicationV2ApprovalResult> {
  const result = await approveApplicationV2Transaction(applicationId, approvedBy, options);
  return deliverPreparedInvitation(result, options);
}

export async function reissueAndDeliverOwnershipInvitationV2(
  applicationId: string,
  requestedBy: string,
  options: WorkflowOptions = {},
): Promise<SafeApplicationV2ApprovalResult> {
  const result = await reissueOwnershipInvitationV2Transaction(applicationId, requestedBy, options);
  return deliverPreparedInvitation(result, options);
}
