import { useState, useEffect } from 'react';

export interface GreetingInfo {
  greeting: string;
  timeString: string;
  dateString: string;
  hour: number;
}

export function getGreetingData(date = new Date()): GreetingInfo {
  const hour = date.getHours();
  let greeting = 'Good day';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    greeting = 'Good evening';
  } else {
    greeting = 'Good night';
  }

  const timeString = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateString = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    greeting,
    timeString,
    dateString,
    hour,
  };
}

export function useGreeting(): GreetingInfo {
  const [data, setData] = useState<GreetingInfo>(() => getGreetingData());

  useEffect(() => {
    setData(getGreetingData());
    const interval = setInterval(() => {
      setData(getGreetingData());
    }, 15000); // refresh every 15s to keep time accurate

    return () => clearInterval(interval);
  }, []);

  return data;
}
