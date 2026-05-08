import { LoginPageContent } from '@/components/auth/login-page-content';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <LoginPageContent />
    </div>
  );
}
