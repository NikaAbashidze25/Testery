
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
import { ExternalLink, Mail, User as UserIcon, Building, Briefcase, Globe, ArrowLeft, Inbox, Star, Clock, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
                    
                    // 1. Fetch Projects the User HAS POSTED (as a client/creator)
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

                    // 3. Fetch Reviews the User HAS RECEIVED (for their testing work)
                    const reviewsQuery = query(collection(db, 'reviews'), where('testerId', '==', uid), orderBy('createdAt', 'desc'));
                    const reviewsSnapshot = await getDocs(reviewsQuery);
                    const reviewsData = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
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
  
  const getDefaultTab = () => {
    if (testedProjects.length > 0 || reviews.length > 0) return "tester";
    if (postedProjects.length > 0) return "client";
    return "reviews"; // fallback
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
  const tabCount = [postedProjects, testedProjects, reviews].filter(array => array.length > 0).length;
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3'
  }[tabCount] || 'grid-cols-1';


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
                    <CardDescription className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {userProfile.email}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm">
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
                    {userProfile.accountType === 'company' && userProfile.website && (
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-muted-foreground" />
                                <p className="truncate"><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{userProfile.website} <ExternalLink className="h-4 w-4 flex-shrink-0" /></a></p>
                            </div>
                    )}
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <Tabs defaultValue={getDefaultTab()} className="w-full">
                {hasAnyActivity && (
                    <TabsList className={`grid w-full ${gridClass}`}>
                        {postedProjects.length > 0 && <TabsTrigger value="client">Posted Projects</TabsTrigger>}
                        {testedProjects.length > 0 && <TabsTrigger value="tester">Tested Projects</TabsTrigger>}
                        {reviews.length > 0 && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
                    </TabsList>
                )}
                
                <TabsContent value="client" className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline mb-2">Posted Projects</h2>
                    <p className="text-muted-foreground mb-6">Projects that {userProfile.fullName || userProfile.companyName} has created.</p>
                    {postedProjects.length > 0 ? (
                        postedProjects.map(project => (
                                <Card key={project.id}>
                                    <CardHeader>
                                        <CardTitle>{project.title}</CardTitle>
                                        <CardDescription>Posted {formatDate(project.postedAt)}</CardDescription>
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
                                            <Link href={`/projects/${project.id}`}>View Project Details</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))
                    ) : (
                      <Card className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <CardTitle className="text-lg">No Projects Posted</CardTitle>
                        <CardDescription>This user hasn't posted any projects yet.</CardDescription>
                      </Card>
                    )}
                </TabsContent>

                <TabsContent value="tester" className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline mb-2">Tested Projects</h2>
                    <p className="text-muted-foreground mb-6">Projects that {userProfile.fullName || userProfile.companyName} has participated in as a tester.</p>
                    {testedProjects.length > 0 ? (
                        testedProjects.map(project => (
                          <Card key={project.id}>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                {project.title}
                              </CardTitle>
                              <CardDescription>
                                Application accepted {formatDate(project.testedAt)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{project.description}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {project.skills.map(skill => (
                                  <Badge key={skill} variant="outline">{skill}</Badge>
                                ))}
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/projects/${project.id}`}>View Project Details</Link>
                              </Button>
                            </CardFooter>
                          </Card>
                        ))
                    ) : (
                      <Card className="text-center py-12">
                        <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <CardTitle className="text-lg">No Tests Completed</CardTitle>
                        <CardDescription>This user hasn't tested any projects yet.</CardDescription>
                      </Card>
                    )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline mb-2">Reviews</h2>
                    <p className="text-muted-foreground mb-6">Feedback from clients on their testing work.</p>
                    {reviews.length > 0 ? (
                        reviews.map(review => (
                                <Card key={review.id}>
                                    <CardHeader>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={review.clientAvatar} />
                                                <AvatarFallback>{getInitials(review.clientName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-lg">{review.clientName}</CardTitle>
                                                <CardDescription>
                                                    {formatDate(review.createdAt)}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {renderStars(review.rating)}
                                        <p className="text-muted-foreground mt-2">{review.comment}</p>
                                    </CardContent>
                                </Card>
                            ))
                    ) : (
                      <Card className="text-center py-12">
                        <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <CardTitle className="text-lg">No Reviews Yet</CardTitle>
                        <CardDescription>This user hasn't received any reviews yet.</CardDescription>
                      </Card>
                    )}
                </TabsContent>
               </Tabs>

                {!hasAnyActivity && (
                     <Card className="text-center py-12">
                        <CardHeader>
                                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                                <Inbox className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <CardTitle className="mt-4">No Activity Yet</CardTitle>
                            <CardDescription>This user hasn't posted, tested, or received reviews on any projects.</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
