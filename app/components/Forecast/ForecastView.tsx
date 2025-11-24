import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import type { Chart as ChartType, ChartConfiguration, TooltipItem } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

declare global {
  interface Window {
    _forecastChart?: ChartType | null;
  }
}

type Hour = {
  datetime?: string;
  temp?: number;
  conditions?: string;
  icon?: string;
  datetimeEpoch?: number;
  humidity?: number;
  wspd?: number;
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
      const targetDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek);
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

  const hours: Hour[] = useMemo(() => data?.hours || [], [data]);

  // memoize chart config so effect deps are stable
  const hoursKey = useMemo(() => JSON.stringify(hours.map(h => ({ dt: h.datetimeEpoch, t: h.temp, h: h.humidity, w: h.wspd }))), [hours]);

  // helper to read numeric values from several possible provider keys
  const readNumber = (h: Hour, ...keys: string[]) => {
    const rec = h as Record<string, unknown>;
    for (const k of keys) {
      const v = rec[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))) return Number(v);
    }
    return null as number | null;
  };

  // compute simple descriptive messages (must be before any early return)
  const cToF = (c: number) => (c * 9/5) + 32;

  const avg = useMemo(() => {
    const nums = hours.filter(h => typeof h.temp === 'number').map(h => h.temp as number);
    const avgTempC = nums.length ? nums.reduce((a,b) => a+b, 0) / nums.length : null;
    const avgTempF = avgTempC != null ? cToF(avgTempC) : null;
    const avgHum = hours.map(h => readNumber(h, 'humidity', 'hum', 'rh')).filter(v => typeof v === 'number') as number[];
    const avgHumVal = avgHum.length ? avgHum.reduce((a,b) => a+b, 0) / avgHum.length : null;
    const avgWind = hours.map(h => readNumber(h, 'wspd', 'windspeed', 'windSpeed', 'wind_kph', 'wind_kmh')).filter(v => typeof v === 'number') as number[];
    const avgWindVal = avgWind.length ? avgWind.reduce((a,b) => a+b, 0) / avgWind.length : null;
  return { avgTempC, avgTempF, avgHumVal, avgWindVal };
  }, [hours]);

  const messages = useMemo(() => {
    const out: string[] = [];
    if (avg.avgTempF != null) {
      const f = avg.avgTempF;
      if (f >= 60 && f <= 75) out.push('Nice day');
      else if (f < 50) out.push('Cool');
      else if (f > 85) out.push('Hot');
    }
    if (avg.avgHumVal != null) {
      if (avg.avgHumVal >= 25 && avg.avgHumVal <= 75) out.push('Chance of rain');
      else if (avg.avgHumVal < 25) out.push('Dry');
      else out.push('Humid');
    }
    if (avg.avgWindVal != null) {
      if (avg.avgWindVal > 8) out.push('Windy');
    }
    return out;
  }, [avg]);

  const chartConfig: ChartConfiguration = useMemo(() => {
    const chartLabels = hours.map((h) => (h.datetimeEpoch ? h.datetimeEpoch * 1000 : undefined)).filter(Boolean) as number[];
  const tempData = hours.map((h) => (typeof h.temp === 'number' ? cToF(h.temp as number) : null));

  const humidityData = hours.map((h) => readNumber(h, 'humidity', 'hum', 'rh'));
  const windData = hours.map((h) => readNumber(h, 'wspd', 'windspeed', 'windSpeed', 'wind_kph', 'wind_kmh'));

    return {
      type: 'line' as const,
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Temperature (°F)',
            data: tempData,
            borderColor: 'rgba(255,99,132,1)',
            backgroundColor: 'rgba(255,99,132,0.2)',
            tension: 0.4,
            yAxisID: 'y1',
          },
          {
            label: 'Humidity (%)',
            data: humidityData,
            borderColor: 'rgba(54,162,235,1)',
            backgroundColor: 'rgba(54,162,235,0.2)',
            tension: 0.4,
            yAxisID: 'y2',
          },
          {
            label: 'Wind Speed',
            data: windData,
            borderColor: 'rgba(75,192,192,1)',
            backgroundColor: 'rgba(75,192,192,0.2)',
            tension: 0.4,
            yAxisID: 'y3',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context: TooltipItem<'line'>) {
                const label = context.dataset?.label ?? '';
                const value = String(context.formattedValue ?? '');
                if (typeof label === 'string' && label.includes('Temperature')) return `${label}: ${value}°F`;
                return `${label}: ${value}`;
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'hour', tooltipFormat: 'PPpp' },
            ticks: { source: 'labels' },
          },
          y1: { type: 'linear', position: 'left', title: { display: true, text: '°F' }, ticks: { callback: function(v: any) { return v + '°F'; } } },
          y2: { type: 'linear', position: 'right', title: { display: true, text: 'Humidity %' }, grid: { drawOnChartArea: false } },
          y3: { type: 'linear', position: 'right', title: { display: true, text: 'Wind' }, grid: { drawOnChartArea: false }, ticks: { display: true } },
        },
      },
    };
  }, [hours]);

  // create/destroy Chart.js instance
  useEffect(() => {
    const canvas = document.getElementById('forecast-chart') as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window._forecastChart) {
      window._forecastChart.destroy();
      window._forecastChart = null;
    }

  const chart = new ChartJS(ctx, chartConfig as ChartConfiguration);
    window._forecastChart = chart;

    return () => {
      try {
        chart.destroy();
      } catch {
        // ignore
      }
      window._forecastChart = null;
    };
  }, [chartConfig, hoursKey]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">No data</div>;
  if (data.error) return <div className="p-4 text-red-600">{data.error}</div>;

  return (
    <div className="w-full p-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="mt-4">
  <div className="grid items-center gap-2" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          <div className="flex justify-start">
            <button aria-label="Previous week" onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1 border rounded">&lt;</button>
          </div>

          <div className="mx-2">
            <div className="text-sm mb-2 text-center">
              <div>{data.resolvedAddress} — {data.date} — {segment}</div>
              {messages.length > 0 && <div className="text-xs text-gray-600 mt-1">{messages.join(' · ')}</div>}
            </div>

            <div className="rounded border p-3">
              <div className="forecast-chart-wrapper">
                <canvas id="forecast-chart" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button aria-label="Next week" onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1 border rounded">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
