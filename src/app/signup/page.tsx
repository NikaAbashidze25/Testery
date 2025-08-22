
'use client';

import { useState, useEffect } from 'react';
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
import { Upload, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage, googleProvider } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const passwordSchema = z.string().min(8, { message: "Password must be at least 8 characters." })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
  .regex(/[0-9]/, { message: "Password must contain at least one number." })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character." });

const individualSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: passwordSchema,
  confirmPassword: z.string(),
  skills: z.string().optional(),
  profilePicture: z.any().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const companySchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: passwordSchema,
  confirmPassword: z.string(),
  industry: z.string().min(2, { message: "Industry must be at least 2 characters." }),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  companyLogo: z.any().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const PasswordStrength = ({ password = '' }: { password?: string }) => {
    const criteria = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        specialChar: /[^A-Za-z0-9]/.test(password),
    };

    const strength = Object.values(criteria).filter(Boolean).length;
    const strengthPercentage = (strength / 5) * 100;

    const CriteriaItem = ({ label, met }: { label: string; met: boolean }) => (
        <div className="flex items-center text-xs">
            {met ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            ) : (
                <Circle className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span className={cn(met ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        </div>
    );

    return (
        <div className="space-y-2">
            <Progress value={strengthPercentage} className="h-2" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <CriteriaItem label="8+ characters" met={criteria.length} />
                <CriteriaItem label="One uppercase letter" met={criteria.uppercase} />
                <CriteriaItem label="One lowercase letter" met={criteria.lowercase} />
                <CriteriaItem label="One number" met={criteria.number} />
                <CriteriaItem label="One special character" met={criteria.specialChar} />
            </div>
        </div>
    );
};

const MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5MB

const GoogleIcon = () => (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
);


export default function SignUpPage() {
  const [accountType, setAccountType] = useState('individual');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [showIndividualPassword, setShowIndividualPassword] = useState(false);
  const [showIndividualConfirmPassword, setShowIndividualConfirmPassword] = useState(false);
  const [showCompanyPassword, setShowCompanyPassword] = useState(false);
  const [showCompanyConfirmPassword, setShowCompanyConfirmPassword] = useState(false);
  
  const [profilePictureName, setProfilePictureName] = useState('');
  const [companyLogoName, setCompanyLogoName] = useState('');

  const individualForm = useForm<z.infer<typeof individualSchema>>({
    resolver: zodResolver(individualSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", skills: "" },
  });

  const companyForm = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "", contactPerson: "", email: "", password: "", confirmPassword: "", industry: "", website: "" },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: any, setName: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) {
      field.onChange(null);
      setName('No file selected');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
        toast({
            variant: 'destructive',
            title: 'File Too Large',
            description: `The selected image must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        });
        e.target.value = ''; // Reset the file input
        field.onChange(null);
        setName('No file selected');
        return;
    }

    field.onChange(e.target.files);
    setName(file.name);
  };
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

         if (!userDocSnap.exists()) {
            let userData;
            if (accountType === 'individual') {
                userData = {
                    uid: user.uid,
                    fullName: user.displayName,
                    email: user.email,
                    profilePictureUrl: user.photoURL,
                    accountType: 'individual',
                    skills: []
                };
            } else { // company
                userData = {
                    uid: user.uid,
                    companyName: user.displayName, // Default to user's name
                    contactPerson: user.displayName, // Default to user's name
                    email: user.email,
                    companyLogoUrl: user.photoURL,
                    accountType: 'company',
                    industry: '',
                    website: ''
                };
            }
            await setDoc(userDocRef, userData);
            toast({
                title: "Account Created",
                description: "Your account has been successfully created with Google.",
            });
        } else {
             toast({
                title: "Login Successful",
                description: `Welcome back, ${user.displayName}!`,
            });
        }
        router.push('/projects');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-In failed",
            description: error.message,
        });
    } finally {
        setIsGoogleLoading(false);
    }
  };


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
            <div className="space-y-4">
                 <Button variant="outline" className="w-full" size="lg" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                    {isGoogleLoading ? 'Signing In...' : <> <GoogleIcon /> Continue with Google </>}
                 </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
                    </div>
                </div>
            </div>


          <Tabs value={accountType} onValueChange={setAccountType} className="w-full pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" disabled={isLoading || isGoogleLoading}>Individual</TabsTrigger>
              <TabsTrigger value="company" disabled={isLoading || isGoogleLoading}>Company</TabsTrigger>
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
                        <FormControl><Input placeholder="John Doe" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                        <FormControl><Input placeholder="you@example.com" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                        <div className="relative">
                            <FormControl>
                                <Input type={showIndividualPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                            </FormControl>
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowIndividualPassword(!showIndividualPassword)}>
                                {showIndividualPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                         <div className="relative">
                            <FormControl>
                                <Input type={showIndividualConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                            </FormControl>
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowIndividualConfirmPassword(!showIndividualConfirmPassword)}>
                                {showIndividualConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    
                  <PasswordStrength password={individualPassword} />

                  <FormField
                    control={individualForm.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills / Categories <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g., Manual Testing, Cypress, Mobile Testing" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                        <div className="flex items-center gap-4">
                          <FormControl>
                            <Button asChild variant="outline" className="w-auto">
                              <label className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                                <Input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, field, setProfilePictureName)}
                                  disabled={isLoading || isGoogleLoading}
                                />
                              </label>
                            </Button>
                          </FormControl>
                          <p className="text-sm text-muted-foreground">{profilePictureName || 'No file selected.'}</p>
                        </div>
                        <FormDescription>Maximum file size: 2.5MB.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading || isGoogleLoading}>{isLoading ? 'Creating Account...' : 'Create Individual Account'}</Button>
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
                        <FormControl><Input placeholder="Acme Inc." {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                        <FormControl><Input placeholder="Jane Smith" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="contact@acme.com" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                         <div className="relative">
                            <FormControl>
                                <Input type={showCompanyPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                            </FormControl>
                             <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCompanyPassword(!showCompanyPassword)}>
                                {showCompanyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={companyForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <div className="relative">
                            <FormControl>
                                <Input type={showCompanyConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                            </FormControl>
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCompanyConfirmPassword(!showCompanyConfirmPassword)}>
                                {showCompanyConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <PasswordStrength password={companyPassword} />

                  <FormField
                    control={companyForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry / Business Sector</FormLabel>
                        <FormControl><Input placeholder="e.g., Technology, E-commerce" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                        <FormControl><Input placeholder="https://www.acme.com" {...field} disabled={isLoading || isGoogleLoading} /></FormControl>
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
                        <div className="flex items-center gap-4">
                           <FormControl>
                            <Button asChild variant="outline" className="w-auto">
                                <label className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Logo
                                    <Input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => handleFileChange(e, field, setCompanyLogoName)}
                                      disabled={isLoading || isGoogleLoading}
                                    />
                                </label>
                          </Button>
                        </FormControl>
                        <p className="text-sm text-muted-foreground">{companyLogoName || 'No file selected.'}</p>
                        </div>
                        <FormDescription>Maximum file size: 2.5MB.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading || isGoogleLoading}>{isLoading ? 'Creating Account...' : 'Create Company Account'}</Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

            <div className="mt-6 text-center text-sm">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                Log in
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
