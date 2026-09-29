import Link from "next/link";
import Button from "@/components/ui/Button";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-ink mb-2">404 - Page Not Found</h1>
        <p className="text-sm text-ink-secondary mb-8">
          The page or worker profile you are looking for doesn't exist, has been removed, or was moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/workers">
            <Button className="w-full inline-flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              Browse Workers
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full inline-flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
