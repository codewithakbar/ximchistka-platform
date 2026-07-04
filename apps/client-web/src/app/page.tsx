'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import { LandingPage } from '@/components/landing-page';

export default function Home() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/home');
    } else {
      setShowLanding(true);
    }
  }, [router]);

  if (!showLanding) return null;
  return <LandingPage />;
}
