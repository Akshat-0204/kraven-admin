import { DOCUMENT_ACCESS_ROLES } from '@kraven/config';
import type { AdminUserRecord, DocumentAccessEntry, DocumentAccessRole } from '@kraven/types';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Editable sharing list: one row per email with a role select, plus an "add email" field.
 * Admins are offered as checkboxes (checked = in the list).
 */
export function AccessPicker({
  value,
  onChange,
  admins = []
}: {
  value: DocumentAccessEntry[];
  onChange: (next: DocumentAccessEntry[]) => void;
  admins?: AdminUserRecord[];
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const has = (address: string) => value.some((entry) => entry.email === address.toLowerCase());

  function toggleAdmin(admin: AdminUserRecord, checked: boolean) {
    const address = admin.email.toLowerCase();
    onChange(checked ? (has(address) ? value : [...value, { email: address, role: 'writer' }]) : value.filter((entry) => entry.email !== address));
  }

  function add() {
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) return setError('Enter a valid email');
    if (!has(address)) onChange([...value, { email: address, role: 'writer' }]);
    setEmail('');
    setError('');
  }

  const adminEmails = new Set(admins.map((admin) => admin.email.toLowerCase()));
  const extras = value.filter((entry) => !adminEmails.has(entry.email));

  function setRole(address: string, role: DocumentAccessRole) {
    onChange(value.map((entry) => (entry.email === address ? { ...entry, role } : entry)));
  }

  function row(address: string, label: string, entry?: DocumentAccessEntry, admin?: AdminUserRecord) {
    return (
      <li key={address} className="flex items-center gap-2 font-body text-sm text-ink-700">
        {admin ? (
          <input type="checkbox" className="accent-olive-700" aria-label={`Share with ${admin.name}`} checked={Boolean(entry)} onChange={(event) => toggleAdmin(admin, event.target.checked)} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {entry ? (
          <Select aria-label={`Role for ${address}`} className="h-8 w-32" value={entry.role} onChange={(event) => setRole(address, event.target.value as DocumentAccessRole)}>
            {DOCUMENT_ACCESS_ROLES.map((role) => (
              <option key={role} value={role}>
                {role === 'writer' ? 'Can edit' : role === 'commenter' ? 'Can comment' : 'Can view'}
              </option>
            ))}
          </Select>
        ) : null}
        {!admin && entry ? (
          <Button className="h-8 w-8 p-0 text-ink-700" aria-label={`Remove ${address}`} onClick={() => onChange(value.filter((item) => item.email !== address))}>
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        ) : null}
      </li>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {admins.map((admin) => row(admin.email.toLowerCase(), `${admin.name} (${admin.email})`, value.find((entry) => entry.email === admin.email.toLowerCase()), admin))}
        {extras.map((entry) => row(entry.email, entry.email, entry))}
      </ul>
      <div className="flex gap-2">
        <Input
          aria-label="Add email"
          placeholder="Add email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" onClick={add}>
          Add
        </Button>
      </div>
      {error ? <p className="font-body text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
