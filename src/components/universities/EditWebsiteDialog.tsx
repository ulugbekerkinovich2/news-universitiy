import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Globe, CheckCircle2 } from "lucide-react";

interface EditWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universityId: string;
  universityName: string;
  currentWebsite: string | null;
  errorMessage?: string | null;
  onSuccess: () => void;
}

export function EditWebsiteDialog({
  open,
  onOpenChange,
  universityId,
  universityName,
  currentWebsite,
  errorMessage,
  onSuccess,
}: EditWebsiteDialogProps) {
  const [website, setWebsite] = useState(currentWebsite || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"success" | "error" | null>(null);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!website.trim()) return;
    
    setIsVerifying(true);
    setVerifyResult(null);
    
    try {
      // Try to fetch the website to verify it's accessible
      const url = website.startsWith("http") ? website : `https://${website}`;
      const response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors", // We can't read the response, but we can check if it fails
      });
      setVerifyResult("success");
    } catch (error) {
      setVerifyResult("error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const url = website.trim() 
        ? (website.startsWith("http") ? website : `https://${website}`)
        : null;
      
      const { error } = await supabase
        .from("universities")
        .update({ 
          website: url,
          scrape_status: url ? "IDLE" : "NO_SOURCE",
          last_error_message: null,
        })
        .eq("id", universityId);

      if (error) throw error;

      toast({
        title: "Website updated",
        description: "University website has been updated successfully",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Website URL</DialogTitle>
          <DialogDescription>
            Update the website URL for {universityName}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Previous error:</p>
              <p className="text-xs mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website">Website URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    setVerifyResult(null);
                  }}
                  placeholder="https://example.edu.uz"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleVerify}
                disabled={!website.trim() || isVerifying}
              >
                {isVerifying ? "Checking..." : "Verify"}
              </Button>
            </div>
          </div>

          {verifyResult && (
            <div className={`flex items-center gap-2 text-sm ${
              verifyResult === "success" ? "text-green-600" : "text-amber-600"
            }`}>
              {verifyResult === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Website appears to be accessible
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Could not verify website (may still work)
                </>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Tip: If the site has SSL issues, try using http:// instead of https://
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save & Retry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
