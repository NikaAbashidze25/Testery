
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="container py-12 md:py-24">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
           <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
             By using our platform, you agree to be bound by these Terms of Service. If you do not agree to these Terms, do not use the services.
            </p>
          </section>
           <section>
            <h2 className="text-2xl font-semibold mb-2">2. Use of the Platform</h2>
            <p className="text-muted-foreground">
             You may use the platform only for lawful purposes and in accordance with these Terms. You agree not to use the platform in any way that violates any applicable federal, state, local, or international law or regulation.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">3. Accounts</h2>
            <p className="text-muted-foreground">
              When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.
            </p>
          </section>
           <section>
            <h2 className="text-2xl font-semibold mb-2">4. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us at contact@testery.com.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
