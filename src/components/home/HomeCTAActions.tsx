"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function HomeCTAActions() {
  const router = useRouter();
  const { user } = useAuth();

  const handleAction = (destination: string) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }
    router.push(destination);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        variant="secondary"
        size="lg"
        onClick={() => handleAction("/workers")}
        className="font-semibold shadow-soft"
      >
        Find Workers
      </Button>
      <Button
        size="lg"
        onClick={() => handleAction("/post-task")}
        className="bg-ink text-white hover:bg-ink/90 font-semibold shadow-soft"
      >
        Post a Task
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => handleAction("/become-worker")}
        className="bg-white/60 border-ink/20 font-semibold text-ink hover:bg-white"
      >
        Become a Worker
      </Button>
    </div>
  );
}
