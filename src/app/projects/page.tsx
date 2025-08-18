
'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, type DocumentData } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { Search, MapPin, Inbox } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Project extends DocumentData {
    id: string;
    title: string;
    companyName: string;
    location: string;
    type: string;
    compensation: string;
    description: string;
    skills: string[];
    postedAt: {
        seconds: number;
        nanoseconds: number;
    };
}


export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const projectsCollection = collection(db, 'projects');
            const q = query(projectsCollection, orderBy('postedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(projectsData);
        } catch (error) {
            console.error("Error fetching projects: ", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchProjects();
  }, []);

  const formatPostedDate = (timestamp: Project['postedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  }

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
      
       {isLoading && (
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full mt-2" />
                        <Skeleton className="h-4 w-2/3 mt-2" />
                         <div className="mt-4 flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-28" />
                    </CardFooter>
                </Card>
            ))}
         </div>
       )}

      {!isLoading && projects.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">No Projects Found</CardTitle>
                <CardDescription>There are currently no projects available. Why not be the first to post one?</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/projects/post">Post a Project</Link>
                </Button>
            </CardContent>
        </Card>
      )}

      {!isLoading && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {projects.map(project => (
              <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{project.companyName}</span>
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
                  <span className="text-sm text-muted-foreground">{formatPostedDate(project.postedAt)}</span>
                  <Button asChild>
                    <Link href={`/projects/${project.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
