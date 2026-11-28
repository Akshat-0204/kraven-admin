import { DOCUMENT_CATEGORIES } from '@kraven/config';
import type { DocumentCategory, DocumentAccessEntry } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileDown, Lock, LockOpen, RefreshCw, Share2, Trash2, Users, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { Select } from '../../components/ui/select';
import { googleQueryKeys, listAdmins, useGoogleStatus } from '../google/googleApi';
import { AccessPicker } from './AccessPicker';
import {
  deleteDocument,
  documentQueryKeys,
  refillDocument,
  reviseDocument,
  saveDocumentPdf,
  setDocumentAccess,
  shareDocument,
  updateDocument
} from './documentApi';
import type { DocumentListItem } from '@kraven/types';

const TYPE_CATEGORY: Record<string, DocumentCategory> = {
  Proposal: 'Proposal',
  'Statement of Work': 'SOW',
  Contract: 'MSA',
  Agreement: 'MSA',
  Handover: 'Handover'
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
}

function SavePdfDialog({ document, onClose }: { document: DocumentListItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const initial = (document.type && TYPE_CATEGORY[document.type]) || 'Other';
  const [category, setCategory] = useState<DocumentCategory>(initial);
  const [filename, setFilename] = useState(
    `${slug(document.client?.companyName ?? 'client')}_${slug(initial)}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
  const [clientVisible, setClientVisible] = useState(false);
  const mutation = useMutation({
    mutationFn: () => saveDocumentPdf(document.id, { category, filename, clientVisible }),
    onSuccess: () => {
      toast.success('PDF saved to client files');
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      void queryClient.invalidateQueries({ queryKey: ['files'] });
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <Modal
      open
      size="sm"
      title="Save as PDF"
      onClose={onClose}
      footer={
        <>
          <Button className="bg-transparent shadow-none" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending || !filename.trim()} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving...' : 'Save PDF'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
      <label className="block space-y-1 font-body text-sm">
        <span className="text-ink-500">Category</span>
        <Select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
          {DOCUMENT_CATEGORIES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1 font-body text-sm">
        <span className="text-ink-500">Filename</span>
        <Input aria-label="Filename" value={filename} onChange={(event) => setFilename(event.target.value)} />
      </label>
      <label className="flex items-center gap-2 font-body text-sm text-ink-700">
        <input type="checkbox" className="accent-olive-700" checked={clientVisible} onChange={(event) => setClientVisible(event.target.checked)} />
        Visible to client in portal Downloads
      </label>
      </div>
    </Modal>
  );
}

function RenameDialog({ document, onClose }: { document: DocumentListItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(document.title);
  const mutation = useMutation({
    mutationFn: () => updateDocument(document.id, { title: title.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <Modal
      open
      size="sm"
      title="Rename document"
      onClose={onClose}
      footer={
        <>
          <Button className="bg-transparent shadow-none" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending || !title.trim()} onClick={() => mutation.mutate()}>
            Rename
          </Button>
        </>
      }
    >
      <Input aria-label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
    </Modal>
  );
}

function AccessDialog({ document, onClose }: { document: DocumentListItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<DocumentAccessEntry[]>(document.access);
  const adminsQuery = useQuery({ queryKey: googleQueryKeys.admins, queryFn: listAdmins });
  const mutation = useMutation({
    mutationFn: () => setDocumentAccess(document.id, access),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <Modal
      open
      size="sm"
      title="Manage access"
      onClose={onClose}
      footer={
        <>
          <Button className="bg-transparent shadow-none" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Save access
          </Button>
        </>
      }
    >
      <AccessPicker value={access} onChange={setAccess} admins={adminsQuery.data?.admins} />
    </Modal>
  );
}

const iconButton = 'h-8 w-8 p-0 text-ink-700';

/** Per-document actions. Google actions are disabled (with a tooltip) while Google is not connected. */
export function DocumentActions({ document }: { document: DocumentListItem }) {
  const queryClient = useQueryClient();
  const google = useGoogleStatus();
  const [dialog, setDialog] = useState<'pdf' | 'rename' | 'access' | null>(null);
  const isDraft = document.status === 'Draft';
  const refresh = () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
  const run = <T,>(fn: () => Promise<T>, success?: string) =>
    useMutation({ mutationFn: fn, onSuccess: () => { if (success) toast.success(success); void refresh(); }, onError: (error: Error) => toast.error(error.message) });

  const share = run(() => shareDocument(document.id), 'Shared with client portal');
  const revise = run(() => reviseDocument(document.id), 'Unlocked for editing');
  const refill = run(() => refillDocument(document.id), 'Variables refilled');
  const remove = run(() => deleteDocument(document.id), 'Document deleted');

  const gate = (title: string) => google.reason ?? title;
  const name = document.title;

  return (
    <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      <Button asChild className={iconButton} aria-label={`Open ${name}`} title="Open in Google Docs">
        <a href={document.webViewLink} target="_blank" rel="noreferrer">
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </Button>
      {isDraft ? (
        <Button className={iconButton} aria-label={`Rename ${name}`} title={gate('Rename')} disabled={!google.ready} onClick={() => setDialog('rename')}>
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        className={iconButton}
        aria-label={`Save PDF of ${name}`}
        title={document.client ? gate('Save as PDF') : 'Assign a client first'}
        disabled={!google.ready || !document.client}
        onClick={() => setDialog('pdf')}
      >
        <FileDown className="h-3 w-3" aria-hidden="true" />
      </Button>
      {isDraft ? (
        <>
          <Button className={iconButton} aria-label={`Refill ${name}`} title={gate('Refill variables')} disabled={!google.ready || !document.client || refill.isPending} onClick={() => refill.mutate()}>
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
          </Button>
          <Button className={iconButton} aria-label={`Share ${name}`} title={document.client ? gate('Share with client') : 'Assign a client first'} disabled={!google.ready || !document.client || share.isPending} onClick={() => share.mutate()}>
            <Share2 className="h-3 w-3" aria-hidden="true" />
          </Button>
        </>
      ) : document.status === 'Signed' ? (
        <Lock className="mx-1 h-3 w-3 text-ink-500" aria-label="Signed" />
      ) : (
        <Button className={iconButton} aria-label={`Revise ${name}`} title={gate('Revise (unlock and return to Draft)')} disabled={!google.ready || revise.isPending} onClick={() => revise.mutate()}>
          <LockOpen className="h-3 w-3" aria-hidden="true" />
        </Button>
      )}
      <Button className={iconButton} aria-label={`Manage access for ${name}`} title={gate('Manage access')} disabled={!google.ready} onClick={() => setDialog('access')}>
        <Users className="h-3 w-3" aria-hidden="true" />
      </Button>
      {isDraft ? (
        <Button
          className={iconButton}
          aria-label={`Delete ${name}`}
          title={gate('Delete')}
          disabled={!google.ready || remove.isPending}
          onClick={() => {
            if (window.confirm(`Delete "${name}"? This also removes the Google Doc.`)) remove.mutate();
          }}
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </Button>
      ) : null}
      {dialog === 'pdf' ? <SavePdfDialog document={document} onClose={() => setDialog(null)} /> : null}
      {dialog === 'rename' ? <RenameDialog document={document} onClose={() => setDialog(null)} /> : null}
      {dialog === 'access' ? <AccessDialog document={document} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

export function StalePdfBadge({ document }: { document: DocumentListItem }) {
  if (!document.pdfStale) return null;
  return (
    <span className="ml-2 inline-flex h-5 items-center rounded-pill bg-sand-200 px-2 font-body text-[10px] font-medium text-ink-700" title="The Google Doc changed after the PDF was saved">
      PDF out of date
    </span>
  );
}
