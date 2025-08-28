
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Mail, User as UserIcon, Building, Briefcase, Globe, ArrowLeft, Inbox } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

type UserProfile = {
  uid: string;
  email: string;
  accountType: 'individual' | 'company';
  fullName?: string;
  skills?: string[];
  profilePictureUrl?: string;
  companyName?: string;
  contactPerson?: string;
  industry?: string;
  website?: string;
  companyLogoUrl?: string;
};

interface Project extends DocumentData {
    id: string;
    title: string;
    description: string;
    skills: string[];
    postedAt: {
        seconds: number;
        nanoseconds: number;
    };
}


export default function UserProfilePage({ params }: { params: { uid: string } }) {
  const { uid } = params;
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof uid === 'string') {
        const fetchUserProfile = async () => {
            setIsLoading(true);
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                setUserProfile(userDocSnap.data() as UserProfile);
                
                const projectsCollection = collection(db, 'projects');
                const q = query(projectsCollection, where('authorId', '==', uid));
                const querySnapshot = await getDocs(q);
                const projectsData = querySnapshot.docs
                  .map(doc => ({ id: doc.id, ...doc.data() } as Project))
                  .sort((a, b) => b.postedAt.seconds - a.postedAt.seconds);
                setProjects(projectsData);

            } else {
                console.error("No such user!");
            }
            setIsLoading(false);
        };
        fetchUserProfile();
    }
  }, [uid]);

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const formatPostedDate = (timestamp: Project['postedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (isLoading) {
    return (
        <div className="container py-12">
            <Skeleton className="h-10 w-40 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader className="flex flex-col items-center text-center">
                            <Skeleton className="h-24 w-24 rounded-full mb-4" />
                            <Skeleton className="h-8 w-48 mb-2" />
                            <Skeleton className="h-5 w-64" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                     <Skeleton className="h-8 w-56 mb-4" />
                     <Card>
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                        <CardFooter><Skeleton className="h-10 w-28" /></CardFooter>
                     </Card>
                </div>
            </div>
        </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="container py-12 text-center">
        <p className="mb-4">User not found.</p>
        <Button asChild variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
        <div className="mb-8">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={userProfile.profilePictureUrl || userProfile.companyLogoUrl} alt="Profile Picture" />
                        <AvatarFallback className="text-3xl">
                        {getInitials(userProfile.fullName || userProfile.companyName)}
                        </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-3xl">{userProfile.fullName || userProfile.companyName}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {userProfile.email}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm">
                    {userProfile.accountType === 'individual' && (
                        <>
                        <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <p><strong>Full Name:</strong> {userProfile.fullName}</p>
                        </div>

                        {userProfile.skills && userProfile.skills.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-3">
                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                    Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                {userProfile.skills.map(skill => (
                                    <Badge key={skill} variant="secondary">{skill}</Badge>
                                ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}

                    {userProfile.accountType === 'company' && (
                        <>
                            <div className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <p><strong>Company:</strong> {userProfile.companyName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <p><strong>Contact:</strong> {userProfile.contactPerson}</p>
                            </div>
                            <div className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                            <p><strong>Industry:</strong> {userProfile.industry}</p>
                            </div>
                            {userProfile.website && (
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-muted-foreground" />
                                <p className="truncate"><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{userProfile.website} <ExternalLink className="h-4 w-4 flex-shrink-0" /></a></p>
                            </div>
                            )}
                        </>
                    )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-3xl font-bold font-headline">Posted Projects</h2>
                {projects.length > 0 ? (
                    <div className="space-y-4">
                        {projects.map(project => (
                            <Card key={project.id}>
                                <CardHeader>
                                    <CardTitle>{project.title}</CardTitle>
                                    <CardDescription>Posted {formatPostedDate(project.postedAt)}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                                      <div className="flex flex-wrap gap-2">
                                        {project.skills.map(skill => (
                                        <Badge key={skill} variant="secondary">{skill}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild variant="secondary">
                                        <Link href={`/projects/${project.id}`}>View Project</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-12">
                        <CardHeader>
                             <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                                <Inbox className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <CardTitle className="mt-4">No Projects Posted</CardTitle>
                            <CardDescription>This user hasn't posted any projects yet.</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
