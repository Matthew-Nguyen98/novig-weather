import React from 'react';

type Props = {
  location: string;
  setLocation: (v: string) => void;
  date: string;
  setDate: (d: string) => void;
  segment: string;
  setSegment: (s: string) => void;
};

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function ForecastControls({ location, setLocation, date, setDate, segment, setSegment }: Props) {
  return (
    <div className="w-full max-w-3xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <label className="flex flex-col w-full">
          <span className="text-sm font-medium">Location</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City,State or 'Latitude,Longitude'" className="mt-1 rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Day of week</span>
          <select value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded border px-3 py-2">
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Time segment</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value)} className="mt-1 rounded border px-3 py-2">
            <option value="all">All day</option>
            <option value="morning">Morning (8:00-12:00)</option>
            <option value="afternoon">Afternoon (12:00-17:00)</option>
            <option value="evening">Evening (17:00-21:00)</option>
          </select>
        </label>
      </div>
    </div>
  );
}
