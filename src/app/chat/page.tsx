
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, type DocumentData, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Inbox, MessageSquare } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Application extends DocumentData {
    id: string;
    projectTitle: string;
    testerId: string;
    ownerId: string;
    lastMessage?: string;
    lastMessageTimestamp?: {
        seconds: number;
        nanoseconds: number;
    };
    otherUserName?: string;
    otherUserAvatar?: string;
}

export default function ChatsListPage() {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Application[]>([]);
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
      const fetchChats = async () => {
        setIsLoading(true);
        try {
            const isTesterQuery = query(collection(db, 'applications'), where('testerId', '==', user.uid), where('status', '==', 'accepted'));
            const isOwnerQuery = query(collection(db, 'applications'), where('ownerId', '==', user.uid), where('status', '==', 'accepted'));
            
            const [testerSnapshot, ownerSnapshot] = await Promise.all([
                getDocs(isTesterQuery),
                getDocs(isOwnerQuery)
            ]);

            const applications = [...testerSnapshot.docs, ...ownerSnapshot.docs].map(doc => ({ id: doc.id, ...doc.data() } as Application));
            const uniqueApplications = Array.from(new Map(applications.map(item => [item.id, item])).values());
            
            const chatsWithDetails = await Promise.all(
                uniqueApplications.map(async (app) => {
                    const otherUserId = user.uid === app.ownerId ? app.testerId : app.ownerId;
                    const userDocRef = doc(db, 'users', otherUserId);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        app.otherUserName = userData.companyName || userData.fullName;
                        app.otherUserAvatar = userData.companyLogoUrl || userData.profilePictureUrl;
                    }

                    // Fetch last message for sorting
                    const messagesRef = collection(db, 'applications', app.id, 'messages');
                    const lastMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), where('timestamp', '!=', null));
                    const lastMessageSnapshot = await getDocs(lastMessageQuery);
                    if (!lastMessageSnapshot.empty) {
                        const lastMessage = lastMessageSnapshot.docs[0].data();
                        app.lastMessage = lastMessage.text || 'Image';
                        app.lastMessageTimestamp = lastMessage.timestamp;
                    }
                    return app;
                })
            );
            
            chatsWithDetails.sort((a,b) => (b.lastMessageTimestamp?.seconds ?? 0) - (a.lastMessageTimestamp?.seconds ?? 0));

            setChats(chatsWithDetails);
        } catch (error) {
          console.error("Error fetching user's chats: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchChats();
    }
  }, [user]);

  const formatTimestamp = (timestamp: Application['lastMessageTimestamp']) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
        return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  if (isLoading) {
      return (
         <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8">My Chats</h1>
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border">
                         <Skeleton className="h-12 w-12 rounded-full" />
                         <div className="space-y-2 flex-1">
                             <Skeleton className="h-4 w-1/4" />
                             <Skeleton className="h-4 w-1/2" />
                         </div>
                    </div>
                ))}
            </div>
        </div>
      )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">My Chats</h1>
      
      {chats.length === 0 ? (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">No Active Chats</CardTitle>
                <CardDescription>You have no ongoing conversations.</CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
            {chats.map(chat => (
                <Link href={`/chat/${chat.id}`} key={chat.id}>
                    <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                             <Avatar className="h-12 w-12">
                                <AvatarImage src={chat.otherUserAvatar} />
                                <AvatarFallback>{getInitials(chat.otherUserName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold">{chat.otherUserName}</h3>
                                    <p className="text-xs text-muted-foreground">{formatTimestamp(chat.lastMessageTimestamp)}</p>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                            </div>
                        </CardContent>
                    </Card>
                 </Link>
            ))}
        </div>
      )}
    </div>
  );
}
