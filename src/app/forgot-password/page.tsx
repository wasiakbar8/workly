"use client";
import Link from "next/link";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { CheckCircle } from "lucide-react";
import { resetPassword } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send reset link. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold text-ink mb-1">Reset password</h1>
        <p className="text-sm text-ink-secondary mb-6">Enter your email and we&apos;ll send a reset link.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium">
            {error}
          </div>
        )}

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="font-semibold text-ink">Reset link sent!</p>
            <p className="text-sm text-ink-secondary mt-1">Please check your inbox at {email}.</p>
            <Link href="/login" className="inline-block mt-4">
              <Button variant="outline" size="sm">Back to login</Button>
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
          </form>
        )}

        {!sent && (
          <p className="text-center text-sm text-ink-secondary mt-6">
            <Link href="/login" className="underline">Back to login</Link>
          </p>
        )}
      </Card>
    </div>
  );
}
