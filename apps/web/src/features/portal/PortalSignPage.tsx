import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type PointerEvent, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PortalShell } from './PortalPage';
import { portalApi, portalDocumentPdfUrl, portalQueryKeys } from './portalApi';

/** Sign a document from a pack: typed or drawn signature, explicit consent, then a sealed PDF. */
export function PortalSignPage() {
  const { slug = '', documentId = '' } = useParams();
  const queryClient = useQueryClient();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const [name, setName] = useState('');
  const [method, setMethod] = useState<'typed' | 'drawn'>('typed');
  const [consent, setConsent] = useState(false);
  const back = `/c/${encodeURIComponent(slug)}`;

  const sign = useMutation({
    mutationFn: () =>
      portalApi.sign(documentId, {
        signerName: name.trim(),
        method,
        consent,
        signatureImage: method === 'drawn' ? canvas.current?.toDataURL('image/png') : undefined
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalQueryKeys.all })
  });

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 400, y: ((event.clientY - rect.top) / rect.height) * 150 };
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = point(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext('2d');
    if (!drawing.current || !ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setInked(true);
  };
  const clear = () => {
    canvas.current?.getContext('2d')?.clearRect(0, 0, 400, 150);
    setInked(false);
  };

  const ready = name.trim().length >= 2 && consent && (method === 'typed' || inked);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready) sign.mutate();
  }

  if (sign.isSuccess) {
    return (
      <PortalShell>
        <p className="rounded border border-border bg-panel p-4 text-sm">Thank you. The document has been signed and sealed.</p>
        <Link to={back} className="mt-4 inline-block text-sm underline">
          Back to portal
        </Link>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <Link to={back} className="text-sm text-muted hover:text-white">
        Back to portal
      </Link>
      <form onSubmit={submit} className="mx-auto mt-6 max-w-md space-y-4 rounded border border-border bg-panel p-6">
        <h1 className="text-xl font-semibold">Sign document</h1>
        <a href={portalDocumentPdfUrl(documentId)} target="_blank" rel="noopener noreferrer" className="text-sm underline">
          Review the document (PDF)
        </a>
        <Input aria-label="Full name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-4 text-sm">
          {(['typed', 'drawn'] as const).map((value) => (
            <label key={value} className="flex items-center gap-1">
              <input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />
              {value === 'typed' ? 'Type my name' : 'Draw signature'}
            </label>
          ))}
        </div>
        {method === 'typed' ? (
          <p className="rounded bg-white px-3 py-4 text-center font-serif text-3xl italic text-black">{name || 'Your name'}</p>
        ) : (
          <div>
            <canvas
              ref={canvas}
              width={400}
              height={150}
              aria-label="Signature pad"
              className="w-full touch-none rounded bg-white"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={() => (drawing.current = false)}
              onPointerLeave={() => (drawing.current = false)}
            />
            <button type="button" className="mt-1 text-xs underline" onClick={clear}>
              Clear
            </button>
          </div>
        )}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          I agree to sign this document electronically and understand my signature, name, time, IP address and device will be recorded.
        </label>
        {sign.error ? (
          <p role="alert" className="text-sm text-red-400">
            {sign.error.message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={!ready || sign.isPending}>
          {sign.isPending ? 'Signing...' : 'Sign document'}
        </Button>
      </form>
    </PortalShell>
  );
}
