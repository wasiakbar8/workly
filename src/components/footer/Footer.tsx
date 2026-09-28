import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-ink text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-ink" />
              </div>
              <span className="text-xl font-bold">Workly</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Find the right person for any task. From home repairs to digital work.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Explore</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="/workers" className="hover:text-white transition-colors">Find Workers</Link></li>
              <li><Link href="/become-worker" className="hover:text-white transition-colors">Become a Worker</Link></li>
              <li><Link href="/workers" className="hover:text-white transition-colors">Categories</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Safety</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Trust & Safety</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800 mt-10 pt-6 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} Workly. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
