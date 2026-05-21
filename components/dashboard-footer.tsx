'use client';

import React, { useState, useEffect } from 'react';

export function DashboardFooter() {
  const [year, setYear] = useState('');

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer className="w-full py-4 text-center text-sm text-gray-600">
      © {year} HWSETA Beneficiary Hub | All rights reserved.
    </footer>
  );
}
