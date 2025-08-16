import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Search, DollarSign, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  Quality Testing, On Demand.
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  TestLink connects you with a global network of skilled software testers to ensure your product is bug-free and user-ready.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg">
                  <Link href="/jobs">Find a Job</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/jobs/post">Post a Project</Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://placehold.co/600x400.png"
              width="600"
              height="400"
              alt="Hero"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              data-ai-hint="team collaboration software testing"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">How It Works</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">A Simple Process to Perfection</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our streamlined platform makes it easy for clients to post jobs and for testers to find and complete them.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
            <div className="grid gap-1 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">1. Post a Job</h3>
              <p className="text-sm text-muted-foreground">
                Clients define the scope, tasks, and compensation for their testing needs. Our AI assistant helps create clear acceptance criteria.
              </p>
            </div>
            <div className="grid gap-1 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">2. Testers Apply & Work</h3>
              <p className="text-sm text-muted-foreground">
                Skilled testers browse jobs, apply for those matching their skills, and get to work delivering high-quality feedback.
              </p>
            </div>
            <div className="grid gap-1 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">3. Review & Pay</h3>
              <p className="text-sm text-muted-foreground">
                Clients review submissions. Once the work is approved, payment is securely released to the tester.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Why Choose TestLink?</h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        We provide the tools and community to make software testing seamless and effective for everyone.
                    </p>
                </div>
            </div>
            <div className="mx-auto grid max-w-sm items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3 mt-12">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex items-center justify-center rounded-full bg-primary/10 p-2">
                            <Search className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Job Posting & Search</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Easily post testing jobs and allow our community of testers to find and apply for them with advanced filtering.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex items-center justify-center rounded-full bg-primary/10 p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                        </div>
                        <CardTitle>AI-Powered Assistance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Our GenAI tool helps clients write clear, specific, and measurable acceptance criteria for better outcomes.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex items-center justify-center rounded-full bg-primary/10 p-2">
                           <MessageSquare className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Seamless Communication</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">In-app chat allows for direct and easy communication between clients and testers to clarify requirements and provide feedback.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </section>
    </div>
  );
}
