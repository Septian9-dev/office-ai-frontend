"use client";

import dynamic from "next/dynamic";

const OfficeCanvas = dynamic(() => import("@/components/OfficeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center text-white text-sm">
      Memuat Kantor 3D...
    </div>
  ),
});

export default function Home() {
  return <OfficeCanvas />;
}