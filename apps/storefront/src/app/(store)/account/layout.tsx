import { AccountGuard } from '@/components/account/account-guard';
import { AccountNav } from '@/components/account/account-nav';

export const metadata = { title: 'My Account' };

export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AccountGuard>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
          <AccountNav />
          <div>{children}</div>
        </div>
      </div>
    </AccountGuard>
  );
}
