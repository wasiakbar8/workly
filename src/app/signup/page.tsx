"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Briefcase, CheckCircle } from "lucide-react";
import { signUp, signInWithGoogle } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "worker">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signUp(email, password, fullName, role);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => {
        if (role === "worker") {
          router.push("/become-worker");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6 text-ink" />
          </div>
          <h1 className="text-xl font-bold text-ink">Create your account</h1>
          <p className="text-sm text-ink-secondary mt-1">Join Workly to hire or offer services</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <h2 className="text-lg font-bold text-ink">Account created successfully!</h2>
            <p className="text-sm text-ink-secondary mt-1">Redirecting you to your portal...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Role Selector */}
            <div>
              <label className="text-xs font-medium text-ink-secondary block mb-1.5">I want to:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    role === "customer"
                      ? "bg-primary border-primary text-ink"
                      : "bg-white border-border text-ink-secondary hover:bg-surface-muted"
                  }`}
                >
                  Hire Workers
                </button>
                <button
                  type="button"
                  onClick={() => setRole("worker")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    role === "worker"
                      ? "bg-primary border-primary text-ink"
                      : "bg-white border-border text-ink-secondary hover:bg-surface-muted"
                  }`}
                >
                  Work & Earn
                </button>
              </div>
            </div>

            <Input
              label="Full name"
              placeholder="Your name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-ink-muted">or</span></div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => signInWithGoogle()}
          type="button"
        >
          Continue with Google
        </Button>

        <p className="text-center text-sm text-ink-secondary mt-6">
          Already have an account? <Link href="/login" className="font-medium text-ink underline">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
