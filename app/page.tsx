"use client";
import dynamic from 'next/dynamic';
const Forecast = dynamic(() => import('./components/Forecast'));

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-4xl">
        <h1 className="p-6 text-2xl font-semibold">Weather forecast (Weather Crossing)</h1>
        <Forecast />
      </main>
    </div>
  );
}
