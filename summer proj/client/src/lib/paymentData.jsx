import React from 'react';
import { Building2 } from 'lucide-react';

export const NEPAL_BANKS = [
  'Nabil Bank',
  'Global IME Bank',
  'NIC Asia Bank',
  'Nepal Investment Mega Bank (NIMB)',
  'Rastriya Banijya Bank (RBB)',
  'Himalayan Bank',
  'Everest Bank',
  'Sanima Bank',
  'Standard Chartered Bank Nepal',
  'Prabhu Bank',
  'Other Commercial / Development Bank'
];

export const NEPAL_PROVINCES = [
  'Bagmati Province',
  'Koshi Province',
  'Madhesh Province',
  'Gandaki Province',
  'Lumbini Province',
  'Karnali Province',
  'Sudurpashchim Province'
];

export const COUNTRIES = [
  'Nepal',
  'India',
  'United States',
  'United Kingdom',
  'Australia',
  'Canada',
  'United Arab Emirates',
  'Other Country'
];

/* Custom Badges/Logos for Authentic Brand Experience */
export function EsewaLogo({ className = "h-5 w-5" }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-[#60BB46] text-white font-black text-[12px] select-none shrink-0 shadow-xs ${className}`}>
      e
    </div>
  );
}

export function KhaltiLogo({ className = "h-5 w-5" }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-[#5C2D91] text-white font-black text-[11px] select-none shrink-0 shadow-xs ${className}`}>
      K
    </div>
  );
}

export function FonepayLogo({ className = "h-5 w-5" }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-[#ED1C24] text-white font-black text-[12px] italic select-none shrink-0 shadow-xs ${className}`}>
      f
    </div>
  );
}

export function BankLogo({ className = "h-5 w-5" }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-[#1E3A8A] text-white select-none shrink-0 shadow-xs ${className}`}>
      <Building2 className="h-3 w-3" />
    </div>
  );
}

export const PAYMENT_PROVIDERS = [
  {
    id: 'esewa',
    label: 'eSewa',
    sublabel: 'eSewa Mobile Wallet',
    logo: EsewaLogo,
    bgClass: 'bg-[#60BB46]/10 text-[#60BB46] border-[#60BB46]/30',
    activeClass: 'bg-[#60BB46] text-white border-[#60BB46] shadow-sm',
    accentColor: '#60BB46'
  },
  {
    id: 'khalti',
    label: 'Khalti',
    sublabel: 'Khalti Digital Wallet',
    logo: KhaltiLogo,
    bgClass: 'bg-[#5C2D91]/10 text-[#5C2D91] border-[#5C2D91]/30',
    activeClass: 'bg-[#5C2D91] text-white border-[#5C2D91] shadow-sm',
    accentColor: '#5C2D91'
  },
  {
    id: 'fonepay',
    label: 'Fonepay',
    sublabel: 'Fonepay QR / Direct',
    logo: FonepayLogo,
    bgClass: 'bg-[#ED1C24]/10 text-[#ED1C24] border-[#ED1C24]/30',
    activeClass: 'bg-[#ED1C24] text-white border-[#ED1C24] shadow-sm',
    accentColor: '#ED1C24'
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    sublabel: 'Direct Bank Account Deposit',
    logo: BankLogo,
    bgClass: 'bg-blue-600/10 text-blue-700 border-blue-600/30',
    activeClass: 'bg-blue-700 text-white border-blue-700 shadow-sm',
    accentColor: '#1E40AF'
  }
];

export function getProviderConfig(providerId) {
  return (
    PAYMENT_PROVIDERS.find((p) => p.id === providerId) || {
      id: 'digital_wallet',
      label: 'Digital Wallet',
      sublabel: 'Payment Transfer',
      logo: BankLogo,
      bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-300',
      activeClass: 'bg-zinc-900 text-white border-zinc-900',
      accentColor: '#18181B'
    }
  );
}
