
'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, where, type DocumentData } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { Search, MapPin, Inbox, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';


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
    authorId: string;
}

interface Application extends DocumentData {
    projectId: string;
    status: 'pending' | 'accepted' | 'declined';
}


export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [applications, setApplications] = useState<Map<string, Application>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProjectsAndApplications = async () => {
        setIsLoading(true);
        try {
            // Fetch applications if user is logged in
            if (user) {
                const appsCollection = collection(db, 'applications');
                const appsQuery = query(appsCollection, where('testerId', '==', user.uid));
                const appsSnapshot = await getDocs(appsQuery);
                const userApps = new Map<string, Application>();
                appsSnapshot.forEach(doc => {
                    const appData = doc.data() as Application;
                    userApps.set(appData.projectId, appData);
                });
                setApplications(userApps);
            }

            // Fetch projects
            const projectsCollection = collection(db, 'projects');
            const q = query(projectsCollection, orderBy('postedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            let projectsData = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Project));

            // Exclude user's own projects from the list
            if (user) {
                projectsData = projectsData.filter(p => p.authorId !== user.uid);
            }

            setProjects(projectsData);
        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setIsLoading(false);
        }
    };
    if (!isAuthLoading) {
        fetchProjectsAndApplications();
    }
  }, [user, isAuthLoading]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
        const matchesSearch = searchQuery.toLowerCase() === '' ||
            project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesLocation = locationQuery.toLowerCase() === '' ||
            project.location.toLowerCase().includes(locationQuery.toLowerCase());

        return matchesSearch && matchesLocation;
    });
  }, [projects, searchQuery, locationQuery]);

  const formatPostedDate = (timestamp: Project['postedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  const getApplicationStatusBadge = (status: Application['status']) => {
    if (status === 'pending') {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="mr-1 h-3 w-3" />Applied</Badge>;
    }
    if (status === 'accepted') {
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
    }
    // No badge for declined to keep UI clean, user can check in their applications tab.
    return null;
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
          <Input 
            placeholder="Project title, keywords, or company" 
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex-grow">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Location" 
            className="pl-10 h-12"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
           />
        </div>
        <Button size="lg" className="h-12" onClick={() => {}}>Search</Button>
      </div>
      
       {(isLoading || isAuthLoading) && (
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

      {!isLoading && !isAuthLoading && filteredProjects.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">No Projects Found</CardTitle>
                <CardDescription>
                    {searchQuery || locationQuery 
                        ? "Try adjusting your search criteria." 
                        : "There are currently no projects available. Check back later!"
                    }
                </CardDescription>
            </CardHeader>
        </Card>
      )}

      {!isLoading && !isAuthLoading && filteredProjects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {filteredProjects.map(project => {
              const application = applications.get(project.id);
              return (
              <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{project.title}</CardTitle>
                    {application && getApplicationStatusBadge(application.status)}
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-2 text-sm">
                      <Link href={`/users/${project.authorId}`} className="font-semibold text-primary hover:underline">
                        {project.companyName}
                      </Link>
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
              )
            })}
          </div>
        )}
    </div>
  );
}
