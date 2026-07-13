"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If we have a token, go to dashboard, else go to login
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const slug = typeof window !== "undefined" ? localStorage.getItem("org_slug") : null;
    if (token && slug) {
      router.push(`/${slug}`);
    } else {
      router.push(slug ? `/${slug}` : "/cosmos");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-pulse text-indigo-600 font-semibold">
        Redirecting...
      </div>
    </div>
  );
}
