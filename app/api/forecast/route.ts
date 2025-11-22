import { NextResponse } from 'next/server';

const WEATHER_KEY = process.env.WEATHER_API_KEY;

if (!WEATHER_KEY) {
  console.warn('WEATHER_API_KEY is not set in environment');
}

function getSegmentHours(segment: string) {
  switch (segment) {
    case 'morning':
      return { start: 8, end: 12 };
    case 'afternoon':
      return { start: 12, end: 17 };
    case 'evening':
      return { start: 17, end: 21 };
    default:
      return { start: 0, end: 23 };
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get('location') || 'New York,NY';
    const date = url.searchParams.get('date'); // YYYY-MM-DD
    const segment = url.searchParams.get('segment') || 'all';

    // Visual Crossing (Weather Crossing) historical/forecast endpoint
    // We'll request 48 hours around the date when provided; otherwise default forecast
    const vcBase = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

    const reqDate = date || 'next7';
    const fetchUrl = `${vcBase}/${encodeURIComponent(location)}/${reqDate}?unitGroup=metric&key=${WEATHER_KEY}&include=hours`;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data: {
      resolvedAddress?: string;
      days?: Array<{
        datetime?: string;
        description?: string;
        conditions?: string;
        hours?: Array<{
          datetime?: string;
          datetimeEpoch?: number;
          temp?: number;
          conditions?: string;
          icon?: string;
        }>;
      }>;
    } = await res.json();

    // If a specific date was requested, find that day in data.days
  type HourItem = { datetime?: string; datetimeEpoch?: number; temp?: number; conditions?: string; icon?: string };
  let dayData: { datetime?: string; description?: string; conditions?: string; hours?: Array<HourItem> } | null = null;
    if (date && Array.isArray(data.days)) {
      dayData = data.days.find((d) => d.datetime === date) || data.days[0] || null;
    } else if (Array.isArray(data.days)) {
      // default to first day
      dayData = data.days[0] || null;
    }

    if (!dayData) {
      return NextResponse.json({ error: 'No day data returned from provider' }, { status: 502 });
    }

    const hours = Array.isArray(dayData.hours) ? dayData.hours : [];
    const { start, end } = getSegmentHours(segment);
    const filtered = hours.filter((h: HourItem) => {
      const epoch = typeof h.datetimeEpoch === 'number' ? h.datetimeEpoch : 0;
      const hour = new Date(epoch * 1000).getHours();
      return hour >= start && hour < end;
    });

  const out = {
      resolvedAddress: data.resolvedAddress || location,
      queryLocation: location,
      date: dayData.datetime,
      segment,
      summary: dayData.description || dayData.conditions || null,
      hours: filtered,
      rawDay: dayData,
    };

    return NextResponse.json(out);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
