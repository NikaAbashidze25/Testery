
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Mail, User as UserIcon, Building, Briefcase, Globe, Edit, FileText, Send } from 'lucide-react';


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

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, now fetch their profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          // Handle case where user exists in Auth but not in Firestore
          console.error("No profile data found in Firestore for this user.");
        }
      } else {
        // User is signed out
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  if (isLoading) {
    return (
        <div className="container py-12">
            <Card className="max-w-2xl mx-auto">
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
                     <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-center gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="container py-12 text-center">
        <p className="mb-4">You need to be logged in to view this page.</p>
        <Button asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
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
        <CardContent className="space-y-6">
          {userProfile.accountType === 'individual' && (
            <>
              <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Full Name:</strong> {userProfile.fullName}</p>
              </div>

              {userProfile.skills && userProfile.skills.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-3">
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
                  <p><strong>Company Name:</strong> {userProfile.companyName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Contact Person:</strong> {userProfile.contactPerson}</p>
                </div>
                 <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Industry:</strong> {userProfile.industry}</p>
                </div>
                {userProfile.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <p><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{userProfile.website} <ExternalLink className="h-4 w-4" /></a></p>
                  </div>
                )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
            <Button asChild>
                <Link href="/profile/edit">
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Link>
            </Button>
            {userProfile.accountType === 'company' && (
                 <Button asChild variant="outline">
                    <Link href="/profile/my-projects">
                        <FileText className="mr-2 h-4 w-4" /> My Projects
                    </Link>
                </Button>
            )}
            {userProfile.accountType === 'individual' && (
                 <Button asChild variant="outline">
                    <Link href="/profile/my-applications">
                        <Send className="mr-2 h-4 w-4" /> My Applications
                    </Link>
                </Button>
            )}
           
        </CardFooter>
      </Card>
    </div>
  );
}
