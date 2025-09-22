"use client";

import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import HomeContent from "@/app/HomeContent";

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomeContent />
    </Suspense>
  );
}
