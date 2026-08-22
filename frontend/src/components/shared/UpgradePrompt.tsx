import { Lock } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  title: string;
  message: string;
  upgradeLink: string;
}

export default function UpgradePrompt({ title, message, upgradeLink }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 max-w-lg mx-auto font-montserrat">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-8 sm:p-10 text-center shadow-xl w-full">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[var(--heading)] font-display uppercase tracking-wider mb-3">
          {title}
        </h2>
        <p className="text-sm text-[var(--body)] leading-relaxed mb-8 max-w-sm mx-auto">
          {message}
        </p>
        <Link 
          href={upgradeLink} 
          className="inline-block w-full sm:w-auto px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}
