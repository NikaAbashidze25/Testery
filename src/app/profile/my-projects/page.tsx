
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Inbox, ArrowLeft, Edit, Users, Eye } from 'lucide-react';

interface Project extends DocumentData {
    id: string;
    title: string;
    companyName: string;
    location: string;
    description: string;
    skills: string[];
    postedAt: {
        seconds: number;
        nanoseconds: number;
    };
    applicantCount?: number;
    pendingApplicantCount?: number;
}

export default function MyProjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      const fetchProjects = async () => {
        setIsLoading(true);
        try {
          const projectsCollection = collection(db, 'projects');
          const q = query(projectsCollection, where('authorId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          const projectsData = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Project));
            
          const projectIds = projectsData.map(p => p.id);
          if (projectIds.length > 0) {
              const appsRef = collection(db, 'applications');
              const appsQuery = query(appsRef, where('projectId', 'in', projectIds));
              const appsSnapshot = await getDocs(appsQuery);
              
              const counts = new Map<string, { total: number, pending: number }>();
              
              appsSnapshot.forEach(doc => {
                  const appData = doc.data();
                  const projectId = appData.projectId;
                  const currentCounts = counts.get(projectId) || { total: 0, pending: 0 };
                  
                  currentCounts.total += 1;
                  if (appData.status === 'pending') {
                      currentCounts.pending += 1;
                  }
                  
                  counts.set(projectId, currentCounts);
              });

              projectsData.forEach(p => {
                  const projectCounts = counts.get(p.id);
                  p.applicantCount = projectCounts?.total || 0;
                  p.pendingApplicantCount = projectCounts?.pending || 0;
              });
          }

          projectsData.sort((a, b) => b.postedAt.seconds - a.postedAt.seconds);
          setProjects(projectsData);

        } catch (error) {
          console.error("Error fetching user's projects: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjects();
    }
  }, [user]);

  const formatPostedDate = (timestamp: Project['postedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (!user) {
      return (
         <div className="container py-12 text-center">
            <p>Redirecting to login...</p>
        </div>
      )
  }

  return (
    <div className="container py-12">
        <div className="mb-6">
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
            </Button>
        </div>
        <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline">My Projects</h1>
                <p className="text-muted-foreground">Here are all the projects you've created.</p>
            </div>
            <Button asChild>
                <Link href="/projects/post">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Post New Project
                </Link>
            </Button>
      </div>

       {isLoading && (
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full mt-2" />
                         <div className="mt-4 flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Skeleton className="h-10 w-28" />
                        <Skeleton className="h-10 w-28" />
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
                <CardTitle className="mt-4">You Haven't Posted Any Projects Yet</CardTitle>
                <CardDescription>Click the button below to post your first project and find testers.</CardDescription>
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
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>
                      Posted {formatPostedDate(project.postedAt)}
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
                <CardFooter className="flex justify-end gap-2">
                   <Button asChild variant="ghost">
                     <Link href={`/projects/${project.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Project
                      </Link>
                  </Button>
                  <Button asChild className="relative">
                     <Link href={`/projects/${project.id}/applicants`}>
                        <Users className="mr-2 h-4 w-4" />
                        Applicants
                        {(project.applicantCount ?? 0) > 0 && (
                           <Badge 
                                variant={project.pendingApplicantCount && project.pendingApplicantCount > 0 ? 'success' : 'secondary'} 
                                className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0"
                            >
                              {project.pendingApplicantCount && project.pendingApplicantCount > 0 ? project.pendingApplicantCount : project.applicantCount}
                           </Badge>
                        )}
                      </Link>
                  </Button>
                   <Button asChild variant="outline">
                      <Link href={`/projects/${project.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
