import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EditorLoading() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#f1f3f4] text-sm text-[#5f6368]" role="status">
      Loading editor…
    </div>
  );
}

export function EditorMessage({ message, backTo }: { message: string; backTo: string }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#f1f3f4] text-[#1f1f1f]">
      <p role="alert" className="text-sm">
        {message}
      </p>
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-[#0b57d0] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
    </div>
  );
}
