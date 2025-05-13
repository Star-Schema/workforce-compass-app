
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Shield, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { makeHardcodedEmailAdmin } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MakeAdminSectionProps {
  email?: string;
  onSuccess?: () => void;
}

const MakeAdminSection = ({ email = "ramoel.bello5@gmail.com", onSuccess }: MakeAdminSectionProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  
  const handleMakeAdmin = async () => {
    try {
      setIsProcessing(true);
      const result = await makeHardcodedEmailAdmin();
      
      if (result) {
        setIsSuccess(true);
        toast({
          title: "Success!",
          description: `${email} is now an admin.`,
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Not found",
          description: `Could not find ${email} in the users list.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error making user admin:", error);
      toast({
        title: "Error",
        description: `Failed to make ${email} an admin.`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Make {email} an admin</CardTitle>
        <CardDescription>
          Grant this email full access to manage users and assign roles
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 text-center">
        <Button 
          onClick={handleMakeAdmin}
          disabled={isProcessing || isSuccess}
          className="px-8"
          size="lg"
        >
          {isSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Admin Access Granted
            </>
          ) : isProcessing ? (
            <>
              <Shield className="mr-2 h-4 w-4 animate-pulse" />
              Setting as admin...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Grant Admin Access
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MakeAdminSection;
