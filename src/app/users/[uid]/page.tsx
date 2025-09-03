
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
import { ExternalLink, Mail, User as UserIcon, Building, Briefcase, Globe, ArrowLeft, Inbox, Star, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
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
}

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

interface TestedProject extends Project {
  testedAt: { 
    seconds: number;
    nanoseconds: number;
  };
  applicationStatus: 'accepted' | 'pending' | 'declined';
}


interface Review extends DocumentData {
    id: string;
    rating: number;
    comment: string;
    clientName: string;
    clientAvatar: string;
    projectId: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
    projectTitle?: string;
}

export default function UserProfilePage({ params }: { params: { uid: string } }) {
  const uid = params.uid;
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [postedProjects, setPostedProjects] = useState<Project[]>([]);
  const [testedProjects, setTestedProjects] = useState<TestedProject[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof uid === 'string') {
        const fetchUserProfile = async () => {
            setIsLoading(true);
            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const profileData = userDocSnap.data() as UserProfile;
                    setUserProfile(profileData);
                    
                    // 1. Fetch Projects the User HAS POSTED
                    const postedProjectsQuery = query(collection(db, 'projects'), where('authorId', '==', uid), orderBy('postedAt', 'desc'));
                    const postedProjectsSnapshot = await getDocs(postedProjectsQuery);
                    const postedProjectsData = postedProjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
                    setPostedProjects(postedProjectsData);

                    // 2. Fetch Projects the User HAS TESTED
                    const testedApplicationsQuery = query(
                        collection(db, 'applications'), 
                        where('testerId', '==', uid),
                        where('status', '==', 'accepted')
                    );
                    const testedApplicationsSnapshot = await getDocs(testedApplicationsQuery);
                    const testedProjectsData = await Promise.all(
                        testedApplicationsSnapshot.docs.map(async (appDoc) => {
                            const appData = appDoc.data();
                            const projectDoc = await getDoc(doc(db, 'projects', appData.projectId));
                            return {
                                ...(projectDoc.data() as Project),
                                id: projectDoc.id,
                                testedAt: appData.appliedAt, 
                                applicationStatus: appData.status,
                            } as TestedProject;
                        })
                    );
                    testedProjectsData.sort((a,b) => b.testedAt.seconds - a.testedAt.seconds);
                    setTestedProjects(testedProjectsData);

                    // 3. Fetch Reviews the User HAS RECEIVED
                    const reviewsQuery = query(collection(db, 'reviews'), where('testerId', '==', uid), orderBy('createdAt', 'desc'));
                    const reviewsSnapshot = await getDocs(reviewsQuery);
                    const reviewsData = await Promise.all(reviewsSnapshot.docs.map(async (reviewDoc) => {
                        const reviewData = { id: reviewDoc.id, ...reviewDoc.data() } as Review;
                        const projectDoc = await getDoc(doc(db, 'projects', reviewData.projectId));
                        if(projectDoc.exists()){
                            reviewData.projectTitle = projectDoc.data().title;
                        }
                        return reviewData;
                    }));
                    setReviews(reviewsData);

                } else {
                    console.error("No such user!");
                }
            } catch (error) {
                console.error("Error fetching user profile data:", error);
            } finally {
                setIsLoading(false);
            }
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

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderStars = (rating: number) => {
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
  };
  
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
    );
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

  const hasAnyActivity = postedProjects.length > 0 || testedProjects.length > 0 || reviews.length > 0;
  
  return (
    <div className="container py-12">
        <div className="mb-8">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8 sticky top-24">
                <Card>
                    <CardHeader className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={userProfile.profilePictureUrl || userProfile.companyLogoUrl} alt="Profile" />
                        <AvatarFallback className="text-3xl">
                        {getInitials(userProfile.fullName || userProfile.companyName)}
                        </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-3xl">{userProfile.fullName || userProfile.companyName}</CardTitle>
                    <CardDescription className="flex items-center justify-center gap-2">
                        <Mail className="h-4 w-4" /> {userProfile.email}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm">
                    {userProfile.accountType === 'company' && userProfile.website && (
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-muted-foreground" />
                                <p className="truncate"><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{userProfile.website} <ExternalLink className="h-4 w-4 flex-shrink-0" /></a></p>
                            </div>
                    )}
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
               
               {/* Work History & Reviews Section */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline">Work History</h2>
                    {reviews.length > 0 ? (
                        reviews.map(review => (
                            <Card key={review.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg text-primary hover:underline">
                                                <Link href={`/projects/${review.projectId}`}>
                                                    {review.projectTitle || 'Completed Project'}
                                                </Link>
                                            </CardTitle>
                                            <CardDescription>
                                                {formatDate(review.createdAt)}
                                            </CardDescription>
                                        </div>
                                        {renderStars(review.rating)}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground italic">"{review.comment}"</p>
                                </CardContent>
                                 <CardFooter>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={review.clientAvatar} />
                                            <AvatarFallback>{getInitials(review.clientName)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{review.clientName}</span>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                      <p className="text-muted-foreground">No items</p>
                    )}
                </div>

                <Separator />

                {/* Skills Section */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline">Skills</h2>
                     {userProfile.skills && userProfile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                        {userProfile.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="text-base py-1 px-4">{skill}</Badge>
                        ))}
                        </div>
                    ) : (
                         <p className="text-muted-foreground">No skills listed.</p>
                    )}
                </div>

                <Separator />

                {/* Project Catalog Section */}
                 <div className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline">Project Catalog</h2>
                    <p className="text-muted-foreground">
                        Projects are a new way to showcase your offerings, highlight your strengths, and attract more clients.
                    </p>
                     {postedProjects.length > 0 ? (
                        <div className="space-y-4">
                            {postedProjects.map(project => (
                                <Card key={project.id} className="bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{project.title}</CardTitle>
                                        <CardDescription>Posted {formatDate(project.postedAt)}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                            {project.skills.map(skill => (
                                            <Badge key={skill} variant="outline">{skill}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                             <Button asChild>
                                <Link href="/projects/post">Manage projects</Link>
                            </Button>
                        </div>
                    ) : (
                      <div>
                        <Button asChild>
                           <Link href="/projects/post">Create a Project</Link>
                        </Button>
                      </div>
                    )}
                </div>


                {!hasAnyActivity && (
                     <Card className="text-center py-12">
                        <CardHeader>
                            <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                                <Inbox className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <CardTitle className="mt-4">No Activity Yet</CardTitle>
                            <CardDescription>This user hasn't posted or tested any projects yet.</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
