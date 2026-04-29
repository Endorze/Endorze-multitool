import { signOut } from '@/auth';

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
      }}
    >
      <button className="secondary-btn" type="submit">
        Sign out
      </button>
    </form>
  );
}
