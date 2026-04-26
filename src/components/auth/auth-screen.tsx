
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Mail, CheckCircle } from 'lucide-react';

type AuthStep = 'login' | 'signup' | 'email-confirmation' | 'forgot-password' | 'reset-sent';

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
  
  const { signIn, signUp, resetPassword } = useAuth();

  const resetFields = () => {
    setEmail('');
    setMobile('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (step === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (step === 'signup') {
        // Validate password match
        if (password !== confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Validate password length
        if (password.length < 6) {
          toast({
            title: "Password Too Short",
            description: "Password must be at least 6 characters long.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, mobile);
        if (!error) {
          // Auto-confirm is enabled, user will be logged in automatically
          // No need to show email confirmation screen
          resetFields();
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
