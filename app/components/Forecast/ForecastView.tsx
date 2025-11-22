import React, { useEffect, useState, useRef } from 'react';

type Hour = {
  datetime?: string;
  temp?: number;
  conditions?: string;
  icon?: string;
  datetimeEpoch?: number;
};

type ForecastData = {
  resolvedAddress?: string;
  date?: string;
  segment?: string;
  hours?: Hour[];
  error?: string;
};

export default function ForecastView({ location, dayOfWeek, segment }: { location: string; dayOfWeek: string; segment: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ForecastData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // We'll map dayOfWeek and weekOffset to a target date: find next occurrence
      const today = new Date();
      const target = new Date(today);
      const targetDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(dayOfWeek);
      const diff = (targetDay - today.getDay() + 7) % 7 + (weekOffset * 7);
      target.setDate(today.getDate() + diff);
      const yyyy = target.toISOString().slice(0,10);

      const params = new URLSearchParams({ location, date: yyyy, segment });
      const res = await fetch(`/api/forecast?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as ForecastData;
        setData(json);
      } else {
        setData({ error: 'Failed to fetch' });
      }
      setLoading(false);
    }
    fetchData();
  }, [location, dayOfWeek, segment, weekOffset]);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current == null) return;
    const endX = e.changedTouches[0].clientX;
    const delta = endX - startX.current;
    if (delta > 40) setWeekOffset((w) => w - 1);
    else if (delta < -40) setWeekOffset((w) => w + 1);
    startX.current = null;
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">No data</div>;
  if (data.error) return <div className="p-4 text-red-600">{data.error}</div>;

  const hours: Hour[] = data.hours || [];

  return (
    <div className="w-full p-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1 border rounded">Previous week</button>
        <div className="text-sm">{data.resolvedAddress} — {data.date} — {segment}</div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1 border rounded">Next week</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hours.length === 0 && <div className="col-span-full">No hours in this segment.</div>}
        {hours.map((h, idx) => (
          <div key={idx} className="rounded border p-3">
            <div className="text-xs text-gray-500">{new Date((h.datetimeEpoch ?? 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-lg font-semibold">{h.temp ? Math.round(h.temp) : '--'}°</div>
            <div className="text-sm text-gray-600">{h.conditions ?? h.icon ?? ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
