export default function Skeleton({ className = '', variant = 'default' }: { className?: string; variant?: 'default' | 'card' | 'text' | 'circle' }) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    default: 'h-4 w-full',
    card: 'h-32 w-full',
    text: 'h-3 w-3/4',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <Skeleton className="h-6 w-1/4 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
