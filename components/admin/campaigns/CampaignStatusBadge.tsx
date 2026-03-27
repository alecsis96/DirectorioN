import StatusBadge from '../shared/StatusBadge';
import type { CampaignDisplayStatus } from '../../../types/campaign';

type Props = {
  status: CampaignDisplayStatus;
  size?: 'sm' | 'md';
};

const labels: Record<CampaignDisplayStatus, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  expired: 'Vencida',
  paused: 'Pausada',
};

const variants: Record<CampaignDisplayStatus, 'critical' | 'warning' | 'info' | 'success'> = {
  active: 'success',
  scheduled: 'info',
  expired: 'warning',
  paused: 'critical',
};

export default function CampaignStatusBadge({ status, size = 'sm' }: Props) {
  return <StatusBadge status={variants[status]} label={labels[status]} size={size} />;
}
