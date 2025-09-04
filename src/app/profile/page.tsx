
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Edit, Mail, User as UserIcon, Briefcase, Bookmark, Send, FileText, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface UserProfile extends DocumentData {
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

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile({ uid: user.uid, ...userDocSnap.data() } as UserProfile);
        } else {
          router.push('/login'); // Or a page to create a profile
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

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
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return null; // Don't render anything until the profile is loaded
  }

  const isCompany = userProfile.accountType === 'company';

  return (
    <div className="container py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <Avatar className="h-24 w-24 text-3xl">
              <AvatarImage src={isCompany ? userProfile.companyLogoUrl : userProfile.profilePictureUrl} />
              <AvatarFallback>{getInitials(isCompany ? userProfile.companyName : userProfile.fullName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-3xl">{isCompany ? userProfile.companyName : userProfile.fullName}</CardTitle>
              <CardDescription className="flex items-center justify-center sm:justify-start gap-2">
                <Mail className="h-4 w-4" />
                {userProfile.email}
              </CardDescription>
              <Badge variant="outline" className="mt-2">
                 {isCompany ? <Building className="mr-2 h-4 w-4" /> : <UserIcon className="mr-2 h-4 w-4" />}
                {userProfile.accountType.charAt(0).toUpperCase() + userProfile.accountType.slice(1)} Account
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 border-t">
          {isCompany ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div><strong>Contact:</strong> {userProfile.contactPerson}</div>
              </div>
              <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div><strong>Industry:</strong> {userProfile.industry}</div>
              </div>
              {userProfile.website && (
                 <div className="flex items-center gap-3 md:col-span-2">
                    <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{userProfile.website}</a></div>
                </div>
              )}
            </div>
          ) : (
             userProfile.skills && userProfile.skills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5"/> Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.skills.map((skill:string) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
            )
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                 {isCompany ? (
                    <Button asChild variant="secondary">
                        <Link href="/profile/my-projects"><FileText className="mr-2"/> My Projects</Link>
                    </Button>
                 ) : (
                    <>
                        <Button asChild variant="secondary">
                            <Link href="/profile/my-applications"><Send className="mr-2"/> My Applications</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/profile/saved-projects"><Bookmark className="mr-2"/> Saved Projects</Link>
                        </Button>
                    </>
                 )}
            </div>
            <Button asChild>
                <Link href="/profile/edit">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
