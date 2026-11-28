import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type PointerEvent, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { PortalShell } from './PortalPage';
import { errorMessage } from '../../lib/api';
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
        <Card className="font-body text-sm text-ink-900">Thank you. The document has been signed and sealed.</Card>
        <Link to={back} className="mt-4 inline-block font-body text-sm text-olive-700 underline">
          Back to portal
        </Link>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <Link to={back} className="font-body text-sm text-ink-500 hover:text-ink-900">
        Back to portal
      </Link>
      <form onSubmit={submit} className="clay-card mx-auto mt-6 max-w-md space-y-4">
        <h1 className="font-display text-xl font-bold text-ink-900">Sign document</h1>
        <a href={portalDocumentPdfUrl(documentId)} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-olive-700 underline">
          Review the document (PDF)
        </a>
        <label className="block space-y-1 font-body text-sm text-ink-700">
          <span>
            Full name <span className="text-danger-fg" aria-hidden="true">*</span>
          </span>
          <Input aria-label="Full name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
          {name.length > 0 && name.trim().length < 2 ? <span className="block text-xs text-danger-fg">Enter your full name (at least 2 characters).</span> : null}
        </label>
        <div className="flex gap-4 font-body text-sm text-ink-700">
          {(['typed', 'drawn'] as const).map((value) => (
            <label key={value} className="flex items-center gap-1">
              <input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />
              {value === 'typed' ? 'Type my name' : 'Draw signature'}
            </label>
          ))}
        </div>
        {method === 'typed' ? (
          <p className="rounded-lg bg-surface-soft px-3 py-4 text-center font-serif text-3xl italic text-ink-900 shadow-clay-inset">{name || 'Your name'}</p>
        ) : (
          <div>
            <canvas
              ref={canvas}
              width={400}
              height={150}
              aria-label="Signature pad"
              className="w-full touch-none rounded-lg bg-surface-soft shadow-clay-inset"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={() => (drawing.current = false)}
              onPointerLeave={() => (drawing.current = false)}
            />
            <button type="button" className="mt-1 text-xs text-ink-500 underline" onClick={clear}>
              Clear
            </button>
          </div>
        )}
        <label className="flex items-start gap-2 font-body text-sm text-ink-700">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            I agree to sign this document electronically and understand my signature, name, time, IP address and device will be recorded.{' '}
            <span className="text-danger-fg" aria-hidden="true">*</span>
          </span>
        </label>
        {!ready && !sign.isPending && (name.trim().length >= 2 || consent || inked) ? (
          <p className="text-xs text-ink-500">
            {name.trim().length < 2 ? 'Enter your name. ' : ''}
            {method === 'drawn' && !inked ? 'Draw your signature. ' : ''}
            {!consent ? 'Tick the consent box to continue.' : ''}
          </p>
        ) : null}
        {sign.error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {errorMessage(sign.error, 'Could not sign the document. Please try again.')}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={!ready || sign.isPending}>
          {sign.isPending ? 'Signing...' : 'Sign document'}
        </Button>
      </form>
    </PortalShell>
  );
}
