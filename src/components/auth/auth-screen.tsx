
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';

type AuthStep = 'login' | 'signup' | 'email-confirmation' | 'forgot-password' | 'reset-sent';

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Enter a valid email address (e.g. you@example.com)" })
  .max(255, { message: "Email is too long" });

const loginPasswordSchema = z
  .string()
  .min(1, { message: "Password is required" });

const signupPasswordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password is too long" })
  .refine((v) => /[A-Z]/.test(v), { message: "Add at least one uppercase letter" })
  .refine((v) => /[a-z]/.test(v), { message: "Add at least one lowercase letter" })
  .refine((v) => /\d/.test(v), { message: "Add at least one number" });

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,15}$/, { message: "Enter a valid mobile number" });

const fullNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(100, { message: "Name is too long" });

type FieldErrors = Partial<Record<'email' | 'password' | 'confirmPassword' | 'fullName' | 'mobile', string>>;

export function AuthScreen() {
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  
  const { signIn, signUp, resetPassword } = useAuth();

  const resetFields = () => {
    setEmail('');
    setMobile('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
  };

  const validateLogin = (): boolean => {
    const next: FieldErrors = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0].message;
    const p = loginPasswordSchema.safeParse(password);
    if (!p.success) next.password = p.error.issues[0].message;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateSignup = (): boolean => {
    const next: FieldErrors = {};
    const n = fullNameSchema.safeParse(fullName);
    if (!n.success) next.fullName = n.error.issues[0].message;
    const m = mobileSchema.safeParse(mobile);
    if (!m.success) next.mobile = m.error.issues[0].message;
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0].message;
    const p = signupPasswordSchema.safeParse(password);
    if (!p.success) next.password = p.error.issues[0].message;
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateForgot = (): boolean => {
    const next: FieldErrors = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0].message;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Field-level validation first
    if (step === 'login' && !validateLogin()) return;
    if (step === 'signup' && !validateSignup()) return;
    if (step === 'forgot-password' && !validateForgot()) return;

    setLoading(true);

    try {
      if (step === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          // Reflect server-side reason inline on the right field
          const code = (error as any).reasonCode;
          if (code === 'no_account') {
            setErrors({ email: "No account found with this email. Please sign up." });
          } else if (code === 'wrong_password') {
            setErrors({ password: "Incorrect password. Try again or use 'Forgot password'." });
          } else if (code === 'email_unverified') {
            setErrors({ email: "Email not verified yet. Check your inbox." });
          }
        }
      } else if (step === 'signup') {
        const { error } = await signUp(email, password, fullName, mobile);
        if (!error) {
          resetFields();
        } else {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setErrors({ email: "This email is already registered. Please log in instead." });
          } else if (msg.includes('weak') || msg.includes('pwned')) {
            setErrors({ password: "This password is too weak / has been leaked. Choose a stronger one." });
          }
        }
      } else if (step === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (!error) {
          setStep('reset-sent');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmailConfirmation = () => {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            Check Your Email
          </h3>
          <p className="text-gray-600">
            We've sent a confirmation email to:
          </p>
          <p className="font-semibold text-gray-900 break-all">
            {signupEmail}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900">
                Next Steps:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 mt-1">
                <li>• Check your email inbox</li>
                <li>• Click the verification link</li>
                <li>• Return here to login</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try signing up again.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setStep('login');
                setSignupEmail('');
              }}
              className="w-full bg-gradient-primary"
            >
              Back to Login
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setStep('signup');
                setSignupEmail('');
              }}
              className="w-full"
            >
              Try Different Email
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderForgotPassword = () => {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Reset Your Password</h3>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>
        
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setStep('login');
              resetFields();
            }}
            className="text-sm"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  };

  const renderResetSent = () => {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            Reset Link Sent
          </h3>
          <p className="text-gray-600">
            We've sent a password reset link to:
          </p>
          <p className="font-semibold text-gray-900 break-all">
            {email}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900">
                Next Steps:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 mt-1">
                <li>• Check your email inbox</li>
                <li>• Click the reset link</li>
                <li>• Enter your new password</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setStep('login');
                resetFields();
              }}
              className="w-full bg-gradient-primary"
            >
              Back to Login
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setStep('forgot-password');
              }}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    const isLogin = step === 'login';

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                placeholder="Enter your mobile number"
              />
            </div>
          </>
        )}
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!isLogin && (
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                placeholder="Confirm your password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full bg-gradient-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isLogin ? 'Logging in...' : 'Creating account...'}
            </>
          ) : (
            isLogin ? 'Login' : 'Sign Up'
          )}
        </Button>

        {isLogin && (
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setStep('forgot-password');
                resetFields();
              }}
              className="text-sm text-muted-foreground"
            >
              Forgot your password?
            </Button>
          </div>
        )}
      </form>
    );
  };

  if (step === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl gradient-text">
              Forgot Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderForgotPassword()}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'reset-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl gradient-text">
              Password Reset
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderResetSent()}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'email-confirmation') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl gradient-text">
              Account Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderEmailConfirmation()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl gradient-text">
            {step === 'login' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderForm()}
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                const next = step === 'login' ? 'signup' : 'login';
                setStep(next);
                resetFields();
              }}
              className="text-sm"
            >
              {step === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
