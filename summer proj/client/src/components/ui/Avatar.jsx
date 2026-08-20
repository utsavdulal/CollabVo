import { ShieldCheck } from 'lucide-react';

export function Avatar({ user, size = 'md', onClick }) {
  const cls = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-xs';
  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const src = user?.photoURL || user?.photo || '';

  return (
    <div className={`relative shrink-0 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      {src ? (
        <img src={src} alt="" className={`${cls} rounded-full object-cover border border-zinc-200`} />
      ) : (
        <div className={`${cls} rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center font-bold`}>
          {initials}
        </div>
      )}
      {user?.verificationStatus === 'verified' && (
        <ShieldCheck className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-blue-600 bg-white rounded-full" />
      )}
    </div>
  );
}
