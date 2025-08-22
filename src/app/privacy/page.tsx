'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export default function PrivacyPolicyPage() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString());
  }, []);

  return (
    <div className="container py-12 md:py-24">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">Last Updated: {currentDate}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to Testery. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">2. Information We Collect</h2>
            <p className="text-muted-foreground">
              We may collect personal information from you such as your name, email address, and payment information when you register for an account. We also collect non-personal information, such as browser type, operating system, and website usage data.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">3. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use the information we collect to provide, operate, and maintain our services, to process transactions, to send you promotional communications, and to improve our platform.
            </p>
          </section>
           <section>
            <h2 className="text-2xl font-semibold mb-2">4. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at contact@testery.com.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
