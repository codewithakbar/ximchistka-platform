'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import { LandingPage } from '@/components/landing-page';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace('/home');
  }, [router]);

  return <LandingPage />;
}
