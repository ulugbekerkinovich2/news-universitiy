import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Shield, UserRound, Users, XCircle } from "lucide-react";

interface UserAccess {
  id: string;
  email: string;
  display_name?: string | null;
  created_at: string;
  role: string;
  is_active: boolean;
  approval_status: string;
  permissions: string[];
  approved_at?: string | null;
}

interface DraftAccess {
  role: string;
  is_active: boolean;
  permissions: string[];
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error");
  }
  if (res.status === 204) return null;
  return res.json();
}

export function UserManagement() {
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftAccess>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void loadData();
  }, []);

  const pendingCount = useMemo(
    () => users.filter((user) => user.approval_status === "PENDING").length,
    [users],
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, permissionsData] = await Promise.all([
        apiRequest("/auth/users"),
        apiRequest("/auth/permissions"),
      ]);
      setUsers(usersData || []);
      setPermissions(permissionsData || []);
      const nextDrafts: Record<string, DraftAccess> = {};
      for (const user of usersData || []) {
        nextDrafts[user.id] = {
          role: user.role,
          is_active: user.is_active,
          permissions: user.permissions || [],
        };
      }
      setDrafts(nextDrafts);
    } catch (error) {
      toast({
        title: "Xato",
        description: "Foydalanuvchilarni yuklashda xato",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraft = (userId: string, patch: Partial<DraftAccess>) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || { role: "user", is_active: false, permissions: [] }),
        ...patch,
      },
    }));
  };

  const togglePermission = (userId: string, permission: string, checked: boolean) => {
    const current = drafts[userId] || { role: "user", is_active: false, permissions: [] };
    const nextPermissions = checked
      ? Array.from(new Set([...current.permissions, permission]))
      : current.permissions.filter((item) => item !== permission);
    updateDraft(userId, { permissions: nextPermissions });
  };

  const approveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingUserId(userId);
    try {
      await apiRequest(`/auth/users/${userId}/approve`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      toast({ title: "Tasdiqlandi", description: "Foydalanuvchi tizimga kirishi mumkin." });
      await loadData();
    } catch (error) {
      toast({
        title: "Xato",
        description: error instanceof Error ? error.message : "Tasdiqlashda xato",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const saveAccess = async (userId: string, approvalStatus?: string) => {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingUserId(userId);
    try {
      await apiRequest(`/auth/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...draft,
          ...(approvalStatus ? { approval_status: approvalStatus } : {}),
        }),
      });
      toast({ title: "Saqlandi", description: "Foydalanuvchi ruxsatlari yangilandi." });
      await loadData();
    } catch (error) {
      toast({
        title: "Xato",
        description: error instanceof Error ? error.message : "Saqlashda xato",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Foydalanuvchilar Boshqaruvi
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Ro'yxatdan o'tganlar admin tasdig'isiz tizimga kira olmaydi.
          </p>
        </div>
        <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
          {pendingCount} ta pending
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          users.map((user) => {
            const draft = drafts[user.id] || {
              role: user.role,
              is_active: user.is_active,
              permissions: user.permissions || [],
            };
            const isPending = user.approval_status === "PENDING";
            const isSaving = savingUserId === user.id;

            return (
              <div key={user.id} className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{user.display_name || user.email}</span>
                      <Badge variant="outline">{user.email}</Badge>
                      <Badge className={user.role === "admin" ? "bg-primary text-primary-foreground" : ""}>
                        {user.role === "admin" ? <Shield className="mr-1 h-3 w-3" /> : <UserRound className="mr-1 h-3 w-3" />}
                        {user.role}
                      </Badge>
                      <Badge variant={isPending ? "destructive" : user.is_active ? "secondary" : "outline"}>
                        {user.approval_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Qo'shilgan: {new Date(user.created_at).toLocaleString("uz-UZ")}
                    </p>
                    {user.approved_at && (
                      <p className="text-xs text-muted-foreground">
                        Tasdiqlangan: {new Date(user.approved_at).toLocaleString("uz-UZ")}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 lg:min-w-[420px]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Role
                        </label>
                        <Select value={draft.role} onValueChange={(value) => updateDraft(user.id, { role: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Role tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Faol holat</p>
                          <p className="text-xs text-muted-foreground">Login qilishga ruxsat</p>
                        </div>
                        <Switch
                          checked={draft.is_active}
                          onCheckedChange={(checked) => updateDraft(user.id, { is_active: checked })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Permissions</p>
                        <p className="text-xs text-muted-foreground">
                          Faqat admin tasdiqlagan ruxsatlar ishlaydi.
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {permissions.map((permission) => (
                          <label key={permission} className="flex items-center gap-2 text-sm text-foreground">
                            <Checkbox
                              checked={draft.permissions.includes(permission)}
                              onCheckedChange={(checked) => togglePermission(user.id, permission, checked === true)}
                            />
                            <span>{permission}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isPending ? (
                        <>
                          <Button disabled={isSaving} onClick={() => void approveUser(user.id)}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => void saveAccess(user.id, "REJECTED")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button disabled={isSaving} onClick={() => void saveAccess(user.id)}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Accessni saqlash
                          </Button>
                          <Button
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => void saveAccess(user.id, user.approval_status === "REJECTED" ? "APPROVED" : "REJECTED")}
                          >
                            {user.approval_status === "REJECTED" ? "Qayta tiklash" : "Block qilish"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
