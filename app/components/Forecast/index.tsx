"use client";
import React, { useState } from 'react';
import ForecastControls from './ForecastControls';
import ForecastView from './ForecastView';

export default function Forecast() {
  const [location, setLocation] = useState('New York,NY');
  const [date, setDate] = useState('Monday');
  const [segment, setSegment] = useState('all');

  return (
    <div className="w-full">
      <ForecastControls location={location} setLocation={setLocation} date={date} setDate={setDate} segment={segment} setSegment={setSegment} />
      <ForecastView location={location} dayOfWeek={date} segment={segment} />
    </div>
  );
}
