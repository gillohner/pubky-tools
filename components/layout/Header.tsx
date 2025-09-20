import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { state, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-semibold text-foreground">
              Pubky Tools
            </h1>
          </Link>
          {state.user && (
            <div className="text-sm text-muted-foreground">
              Connected to: {state.user.publicKey.slice(0, 8)}...
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
