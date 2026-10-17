import { signOut } from "@/actions/auth";

export function SignOutButton({ className = "btn btn-danger btn-block" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
