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
import { API_BASE } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Globe, CheckCircle2 } from "lucide-react";

/**
 * SSRF Protection - Client-side URL validation
 * Matches the server-side validation in url-validator.ts
 */
function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost variants
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost')) {
      return false;
    }
    
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || 
        hostname === 'metadata.google.internal' ||
        hostname === 'metadata.goog' ||
        hostname.endsWith('.internal')) {
      return false;
    }
    
    // Check for private IPv4 ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      
      // Block private/reserved ranges
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a >= 224) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

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
      
      // Client-side SSRF protection
      if (url && !isValidExternalUrl(url)) {
        toast({
          title: "Invalid URL",
          description: "URL must be a public HTTP/HTTPS address. Internal/private addresses are not allowed.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/universities/${universityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ website: url, scrape_status: url ? "IDLE" : "NO_SOURCE", last_error_message: null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Update failed");

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
