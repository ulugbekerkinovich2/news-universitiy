import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, Settings } from "lucide-react";
import { format } from "date-fns";

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Error");
  if (res.status === 204) return null;
  return res.json();
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  expires_at: string | null;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "sk_live_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);

  const [newKeyName, setNewKeyName] = useState("");
  const [rateLimitMinute, setRateLimitMinute] = useState(60);
  const [rateLimitDay, setRateLimitDay] = useState(10000);
  const [expiresAt, setExpiresAt] = useState("");

  const loadApiKeys = useCallback(async () => {
    try {
      const data = await apiRequest("/api-keys");
      setApiKeys(data || []);
    } catch (error) {
      toast.error("API kalitlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) { toast.error("Kalit nomini kiriting"); return; }
    try {
      const plainKey = generateApiKey();
      const keyHash = await hashApiKey(plainKey);
      const keyPrefix = plainKey.substring(0, 12) + "...";
      await apiRequest("/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name: newKeyName.trim(),
          key_hash: keyHash,
          key_prefix: keyPrefix,
          rate_limit_per_minute: rateLimitMinute,
          rate_limit_per_day: rateLimitDay,
          expires_at: expiresAt || null,
        }),
      });
      setNewKeyVisible(plainKey);
      setCreateDialogOpen(false);
      setNewKeyName(""); setRateLimitMinute(60); setRateLimitDay(10000); setExpiresAt("");
      loadApiKeys();
      toast.success("API kalit yaratildi");
    } catch (error) {
      toast.error("Kalit yaratishda xatolik");
    }
  };

  const handleUpdateKey = async () => {
    if (!selectedKey) return;
    try {
      await apiRequest(`/api-keys/${selectedKey.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: newKeyName.trim() || selectedKey.name,
          rate_limit_per_minute: rateLimitMinute,
          rate_limit_per_day: rateLimitDay,
          expires_at: expiresAt || null,
        }),
      });
      setEditDialogOpen(false); setSelectedKey(null);
      loadApiKeys();
      toast.success("API kalit yangilandi");
    } catch (error) {
      toast.error("Yangilashda xatolik");
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      await apiRequest(`/api-keys/${key.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !key.is_active }),
      });
      loadApiKeys();
      toast.success(key.is_active ? "Kalit o'chirildi" : "Kalit yoqildi");
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await apiRequest(`/api-keys/${keyId}`, { method: "DELETE" });
      loadApiKeys();
      toast.success("API kalit o'chirildi");
    } catch (error) {
      toast.error("O'chirishda xatolik");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Nusxa olindi!");
  };

  const openEditDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setNewKeyName(key.name);
    setRateLimitMinute(key.rate_limit_per_minute);
    setRateLimitDay(key.rate_limit_per_day);
    setExpiresAt(key.expires_at ? key.expires_at.split("T")[0] : "");
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Yuklanmoqda...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {newKeyVisible && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Yangi API Kalit Yaratildi
            </CardTitle>
            <CardDescription>Bu kalitni saqlang! Faqat bir marta ko'rsatiladi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-background rounded border font-mono text-sm break-all">
                {newKeyVisible}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKeyVisible)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewKeyVisible(null)}>Yopish</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />API Kalitlari</CardTitle>
              <CardDescription>API kalitlarni yaratish va boshqarish</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />Yangi Kalit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yangi API Kalit Yaratish</DialogTitle>
                  <DialogDescription>API kalitga nom bering va limitlarni sozlang</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nomi</Label>
                    <Input id="name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Masalan: Production API" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rateMinute">Limit (minutiga)</Label>
                      <Input id="rateMinute" type="number" value={rateLimitMinute} onChange={(e) => setRateLimitMinute(parseInt(e.target.value) || 60)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rateDay">Limit (kuniga)</Label>
                      <Input id="rateDay" type="number" value={rateLimitDay} onChange={(e) => setRateLimitDay(parseInt(e.target.value) || 10000)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Amal qilish muddati (ixtiyoriy)</Label>
                    <Input id="expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Bekor qilish</Button>
                  <Button onClick={handleCreateKey}>Yaratish</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Hali API kalitlar yaratilmagan</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Kalit</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>So'rovlar</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell><code className="text-sm text-muted-foreground">{key.key_prefix}</code></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{key.rate_limit_per_minute}/min, {key.rate_limit_per_day}/kun</span></TableCell>
                    <TableCell><span className="font-mono text-sm">{key.request_count.toLocaleString()}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={key.is_active} onCheckedChange={() => handleToggleActive(key)} />
                        <Badge variant={key.is_active ? "default" : "secondary"}>{key.is_active ? "Faol" : "O'chiq"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(key)}><Settings className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>API kalitni o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>Bu amalni bekor qilib bo'lmaydi.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDeleteKey(key.id)}>O'chirish</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Kalitni Tahrirlash</DialogTitle>
            <DialogDescription>Kalit sozlamalarini o'zgartiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nomi</Label>
              <Input id="editName" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRateMinute">Limit (minutiga)</Label>
                <Input id="editRateMinute" type="number" value={rateLimitMinute} onChange={(e) => setRateLimitMinute(parseInt(e.target.value) || 60)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRateDay">Limit (kuniga)</Label>
                <Input id="editRateDay" type="number" value={rateLimitDay} onChange={(e) => setRateLimitDay(parseInt(e.target.value) || 10000)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editExpires">Amal qilish muddati</Label>
              <Input id="editExpires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleUpdateKey}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
