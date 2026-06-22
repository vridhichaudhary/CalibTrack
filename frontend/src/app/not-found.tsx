import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Page not found
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        The page you're looking for doesn't exist.
      </p>
      <Link href="/dashboard">
        <Button>Go to dashboard</Button>
      </Link>
    </div>
  );
}
