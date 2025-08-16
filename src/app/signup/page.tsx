
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

const individualSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  skills: z.string().optional(),
  profilePicture: z.any().optional(),
});

const companySchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  industry: z.string().min(2, { message: "Industry must be at least 2 characters." }),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  companyLogo: z.any().optional(),
});


const PasswordStrength = ({ password = '' }) => {
    let strength = 0;
    if (password.length > 7) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;
    
    const strengthPercentage = (strength / 4) * 100;

    return (
        <>
            <Progress value={strengthPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
                {strength < 2 && "Password is weak."}
                {strength === 2 && "Password is okay."}
                {strength === 3 && "Password is good."}
                {strength === 4 && "Password is strong."}
            </p>
        </>
    )
};


export default function SignUpPage() {
  const [accountType, setAccountType] = useState('individual');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const individualForm = useForm<z.infer<typeof individualSchema>>({
    resolver: zodResolver(individualSchema),
    defaultValues: { fullName: "", email: "", password: "", skills: "" },
  });

  const companyForm = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "", contactPerson: "", email: "", password: "", industry: "", website: "" },
  });

  const onIndividualSubmit = async (values: z.infer<typeof individualSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await sendEmailVerification(user);
      
      let profilePictureUrl = '';
      if (values.profilePicture && values.profilePicture.length > 0) {
        const file = values.profilePicture[0];
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, file);
        profilePictureUrl = await getDownloadURL(storageRef);
      }

      await updateProfile(user, { displayName: values.fullName, photoURL: profilePictureUrl });
      
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: values.fullName,
        email: values.email,
        skills: values.skills?.split(',').map(s => s.trim()) || [],
        profilePictureUrl,
        accountType: 'individual'
      });
      
      toast({
        title: "Account Created",
        description: "A verification email has been sent. Please check your inbox.",
      });
      router.push('/login');

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-up failed",
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };

  const onCompanySubmit = async (values: z.infer<typeof companySchema>) => {
    setIsLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        
        let companyLogoUrl = '';
        if (values.companyLogo && values.companyLogo.length > 0) {
            const file = values.companyLogo[0];
            const storageRef = ref(storage, `company_logos/${user.uid}`);
            await uploadBytes(storageRef, file);
            companyLogoUrl = await getDownloadURL(storageRef);
        }

        await updateProfile(user, { displayName: values.contactPerson, photoURL: companyLogoUrl });

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            companyName: values.companyName,
            contactPerson: values.contactPerson,
            email: values.email,
            industry: values.industry,
            website: values.website,
            companyLogoUrl,
            accountType: 'company',
        });
        
        toast({
            title: "Company Account Created",
            description: "A verification email has been sent. Please check your inbox.",
        });
        router.push('/login');

    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Sign-up failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const individualPassword = individualForm.watch('password');
  const companyPassword = companyForm.watch('password');

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Create Your Testery Account</CardTitle>
          <CardDescription>Join our community of testers and clients.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={accountType} onValueChange={setAccountType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
            </TabsList>
            <TabsContent value="individual">
              <Form {...individualForm}>
                <form onSubmit={individualForm.handleSubmit(onIndividualSubmit)} className="space-y-6 pt-6">
                  <FormField
                    control={individualForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="you@example.com" {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isLoading} /></FormControl>
                         <PasswordStrength password={individualPassword} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills / Categories <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g., Manual Testing, Cypress, Mobile Testing" {...field} disabled={isLoading} /></FormControl>
                        <FormDescription>Separate skills with commas.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="profilePicture"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Profile Picture <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl>
                          <Button asChild variant="outline" className="w-full">
                            <div>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                                <Input type="file" className="hidden" accept="image/*" onChange={(e) => field.onChange(e.target.files)} disabled={isLoading} />
                            </div>
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'Create Individual Account'}</Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="company">
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6 pt-6">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl><Input placeholder="Acme Inc." {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person Name</FormLabel>
                        <FormControl><Input placeholder="Jane Smith" {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</Label>
                        <FormControl><Input placeholder="contact@acme.com" {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={companyForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isLoading} /></FormControl>
                        <PasswordStrength password={companyPassword} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry / Business Sector</FormLabel>
                        <FormControl><Input placeholder="e.g., Technology, E-commerce" {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl><Input placeholder="https://www.acme.com" {...field} disabled={isLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="companyLogo"
                    render={({ field }) => (
                       <FormItem>
                        <FormLabel>Company Logo <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl>
                            <Button asChild variant="outline" className="w-full">
                                <div>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Logo
                                    <Input type="file" className="hidden" accept="image/*" onChange={(e) => field.onChange(e.target.files)} disabled={isLoading} />
                                </div>
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'Create Company Account'}</Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
