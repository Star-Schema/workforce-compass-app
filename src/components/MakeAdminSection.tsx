
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { makeHardcodedEmailAdmin } from '@/lib/supabase';

interface MakeAdminSectionProps {
  onSuccess?: () => void;
}

const MakeAdminSection = ({ onSuccess }: MakeAdminSectionProps) => {
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
          description: "ramoel.bello5@gmail.com is now an admin."
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Not found",
          description: "Could not find ramoel.bello5@gmail.com in the users list.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error making user admin:", error);
      toast({
        title: "Error",
        description: "Failed to make ramoel.bello5@gmail.com an admin.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bg-blue-50 p-8 rounded-lg border border-blue-200 text-center">
      <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
      
      <h2 className="text-2xl font-semibold mb-2">
        Make ramoel.bello5@gmail.com an admin
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Click the button below to make ramoel.bello5@gmail.com an admin user.
      </p>
      
      <Button 
        onClick={handleMakeAdmin}
        disabled={isProcessing || isSuccess}
        variant="outline"
        className="bg-blue-100 hover:bg-blue-200 border-blue-300 font-medium px-8 py-6 h-auto"
        size="lg"
      >
        <Shield className="mr-2 h-5 w-5" />
        {isSuccess ? 
          "Email set as admin" : 
          isProcessing ? 
            "Setting as admin..." : 
            "Make ramoel.bello5@gmail.com admin"
        }
      </Button>
    </div>
  );
};

export default MakeAdminSection;
