import { Scale } from 'lucide-react';

export default function Legal() {
  const sections = [
    {
      title: 'Terms of Service',
      body: 'Collavo is a marketplace and workflow suite connecting commercial businesses with independent content creators. Users agree to communicate professionally, honor confirmed agreements, and uphold verified identity standards.'
    },
    {
      title: 'Privacy & Data Protection',
      body: 'We store only the necessary information required for discovery and security: user profiles, trade verification documents, messages, and transactional escrow ledgers. Government documents are encrypted and accessible strictly to authorized compliance officers.'
    },
    {
      title: 'Virtual Escrow & Platform Currency',
      body: 'In-app balances represent recorded escrow commitments to ensure fair delivery. The virtual escrow mechanism protects creator labor and business budget allocations before bank settlement.'
    },
    {
      title: 'Dispute Resolution & Auto-Release',
      body: 'When both brand and creator confirm deliverable acceptance, funds unlock instantly. In the event of single-party completion confirmation, escrow funds auto-release after 7 calendar days unless a formal dispute is submitted.'
    }
  ];

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Legal, Terms & Privacy</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Platform policies and terms governing campaigns and virtual escrow.</p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-900">{s.title}</h2>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
