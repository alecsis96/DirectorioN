import Link from 'next/link';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
