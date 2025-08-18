
'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const mockProjects = [
  {
    id: '1',
    title: 'Senior QA Engineer for E-commerce Platform',
    company: 'Shopify',
    location: 'Remote',
    type: 'Full-time',
    compensation: '$120,000 - $150,000',
    description: 'We are looking for a Senior QA Engineer to join our team and help us build the future of e-commerce. You will be responsible for testing our platform and ensuring that it is of the highest quality.',
    skills: ['Selenium', 'Cypress', 'JavaScript', 'CI/CD'],
    postedAt: '2 days ago'
  },
  {
    id: '2',
    title: 'Manual Tester for Mobile Gaming App',
    company: 'PixelFun',
    location: 'New York, NY',
    type: 'Contract',
    compensation: '$50/hour',
    description: 'Test our new mobile game on iOS and Android. Looking for someone with a keen eye for detail and a passion for gaming.',
    skills: ['Manual Testing', 'iOS', 'Android', 'JIRA'],
    postedAt: '5 days ago'
  },
  {
    id: '3',
    title: 'Automation Tester (Python)',
    company: 'DataCorp',
    location: 'Remote',
    type: 'Full-time',
    compensation: '$90,000',
    description: 'Join our data analytics team to build and maintain our automation testing framework using Python.',
    skills: ['Python', 'Pytest', 'API Testing', 'SQL'],
    postedAt: '1 week ago'
  },
  {
    id: '4',
    title: 'Junior QA Analyst',
    company: 'Innovate Inc.',
    location: 'San Francisco, CA',
    type: 'Internship',
    compensation: '$25/hour',
    description: 'An exciting opportunity for a student or recent graduate to get hands-on experience in software quality assurance.',
    skills: ['Manual Testing', 'Bug Reporting', 'Teamwork'],
    postedAt: '3 days ago'
  },
];

export default function ProjectsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="container py-12">
      <div className="space-y-4 mb-8 text-center">
        <h1 className="text-4xl font-bold font-headline">Find Your Next Testing Project</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Browse through hundreds of available projects from top companies and startups. Your next opportunity is just a click away.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Project title, keywords, or company" className="pl-10 h-12" />
        </div>
        <div className="relative flex-grow">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Location" className="pl-10 h-12" />
        </div>
        <Button size="lg" className="h-12">Search</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {mockProjects.map(project => (
          <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>{project.title}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 text-sm">
                  <span>{project.company}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {project.location}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.skills.map(skill => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{project.postedAt}</span>
              <Button asChild>
                <Link href={`/projects/${project.id}`}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
