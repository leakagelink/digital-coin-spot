import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MapPin, Phone } from "lucide-react";

export const TermsConditions = () => {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Terms & Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Acceptance of Terms</h3>
          <p className="text-muted-foreground">
            By accessing and using our trading platform, you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Trading Risks</h3>
          <p className="text-muted-foreground">
            Trading in financial instruments involves significant risk and may result in the loss of your invested capital. 
            You should not invest money that you cannot afford to lose and should be aware of all the risks 
            associated with trading.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Account Security</h3>
          <p className="text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account and password. 
            You agree to accept responsibility for all activities that occur under your account or password.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Platform Availability</h3>
          <p className="text-muted-foreground">
            We strive to maintain continuous platform availability but cannot guarantee uninterrupted service. 
            We reserve the right to suspend services for maintenance or updates.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Limitation of Liability</h3>
          <p className="text-muted-foreground">
            Our liability for any claim arising out of or relating to these terms shall not exceed 
            the amount you paid to us in the twelve months preceding the event giving rise to the claim.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Governing Law</h3>
          <p className="text-muted-foreground">
            These terms shall be interpreted and governed by the laws of the jurisdiction in which 
            our company is incorporated, without regard to conflict of law provisions.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">USA Office:</p>
                <p className="text-muted-foreground text-sm">
                  1234 Maple Street<br />
                  Springfield, California (CA) 90210
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">India Office:</p>
                <p className="text-muted-foreground text-sm">
                  House No. 56, Block B, Shakti Vihar<br />
                  New Delhi, Delhi 110092
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <p className="text-muted-foreground">(123) 456-7890</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Changes to Terms</h3>
          <p className="text-muted-foreground">
            We reserve the right to modify these terms at any time. Changes will be effective immediately 
            upon posting on our platform. Your continued use constitutes acceptance of the modified terms.
          </p>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};