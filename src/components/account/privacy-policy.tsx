import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, MapPin, Phone } from "lucide-react";

export const PrivacyPolicy = () => {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Privacy Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Information We Collect</h3>
          <p className="text-muted-foreground">
            We collect information you provide directly to us, such as when you create an account, 
            make trades, or contact us for support. This includes your name, email address, phone number, 
            and financial information necessary for trading.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">How We Use Your Information</h3>
          <p className="text-muted-foreground">
            We use the information we collect to provide, maintain, and improve our services, 
            process transactions, communicate with you, and comply with legal obligations.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Information Sharing</h3>
          <p className="text-muted-foreground">
            We do not sell or rent your personal information to third parties. We may share your information 
            in certain limited circumstances, such as to comply with legal requirements or protect our rights.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Data Security</h3>
          <p className="text-muted-foreground">
            We implement appropriate technical and organizational measures to protect your personal information 
            against unauthorized access, alteration, disclosure, or destruction.
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
          <h3 className="text-lg font-semibold">Updates to Privacy Policy</h3>
          <p className="text-muted-foreground">
            We may update this privacy policy from time to time. We will notify you of any changes 
            by posting the new privacy policy on this page.
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