
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Lightbulb, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const teamMembers = [
  {
    name: 'Nika Abashidze',
    role: 'Founder & CEO',
    avatar: '/avatars/alex.jpg',
    bio: 'The visionary behind Testery, driven by a passion for quality software.',
    social: {
        linkedin: '#',
    }
  },
  {
    name: 'Jane Doe',
    role: 'Lead Developer',
    avatar: '/avatars/jane.jpg',
    bio: 'The architect of our platform, building a seamless experience for users.',
     social: {
        linkedin: '#',
    }
  },
  {
    name: 'John Smith',
    role: 'Community Manager',
    avatar: '/avatars/john.jpg',
    bio: 'The voice of our users, dedicated to building a strong and supportive community.',
     social: {
        linkedin: '#',
    }
  },
];


export default function AboutPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                 <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">About Testery</div>
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  We're Building the Future of Software Testing.
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Testery is more than just a platform; it's a community built on the principle that great software is born from rigorous, collaborative testing.
                </p>
              </div>
            </div>
             <Image
              src="https://placehold.co/600x500.png"
              width="600"
              height="500"
              alt="Our Team"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              data-ai-hint="startup team working office"
            />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Our Mission</h2>
              <p className="text-muted-foreground">
                To empower developers and companies to create flawless digital experiences by connecting them with a global network of skilled, passionate software testers. We believe in breaking down barriers, fostering collaboration, and making high-quality testing accessible to everyone, from individual developers to large enterprises.
              </p>
            </div>
            <div className="flex flex-col gap-8">
                <div className="flex items-start gap-4">
                    <Lightbulb className="h-10 w-10 text-primary mt-1" />
                    <div>
                        <h3 className="text-xl font-bold">Innovation</h3>
                        <p className="text-muted-foreground">We are constantly exploring new tools and methodologies to make the testing process smarter, faster, and more effective.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <Users className="h-10 w-10 text-primary mt-1" />
                    <div>
                        <h3 className="text-xl font-bold">Community</h3>
                        <p className="text-muted-foreground">We are building a supportive, inclusive community where testers can grow their skills and clients can find the talent they need.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Team Section */}
      <section id="team" className="w-full py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Meet the Team</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                We are a small, dedicated team of innovators and problem-solvers passionate about quality.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
            {teamMembers.map((member) => (
              <Card key={member.name} className="text-center">
                 <CardContent className="pt-6">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="professional headshot" />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold">{member.name}</h3>
                  <p className="text-sm text-primary">{member.role}</p>
                  <p className="text-muted-foreground mt-2">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
