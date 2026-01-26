import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, Shield, ShieldOff, Loader2 } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  isAdmin: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, created_at");

      if (profilesError) throw profilesError;

      // Get admin roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(roles?.map((r) => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => ({
        id: p.user_id,
        email: p.email || "No email",
        created_at: p.created_at,
        isAdmin: adminUserIds.has(p.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Xato",
        description: "Foydalanuvchilarni yuklashda xato",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Xato",
        description: "Email kiritilmagan",
        variant: "destructive",
      });
      return;
    }

    setIsAddingAdmin(true);
    try {
      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newAdminEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: "Topilmadi",
          description: "Bu email bilan foydalanuvchi topilmadi",
          variant: "destructive",
        });
        return;
      }

      // Add admin role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: profile.user_id,
        role: "admin",
      });

      if (roleError) {
        if (roleError.code === "23505") {
          toast({
            title: "Mavjud",
            description: "Bu foydalanuvchi allaqachon admin",
            variant: "destructive",
          });
        } else {
          throw roleError;
        }
        return;
      }

      toast({
        title: "Muvaffaqiyatli",
        description: `${newAdminEmail} admin qilindi`,
      });

      setNewAdminEmail("");
      loadUsers();
    } catch (error) {
      console.error("Error adding admin:", error);
      toast({
        title: "Xato",
        description: "Admin qo'shishda xato",
        variant: "destructive",
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const removeAdmin = async (userId: string, email: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Xato",
        description: "O'zingizni admin huquqidan olib tashlay olmaysiz",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      toast({
        title: "Muvaffaqiyatli",
        description: `${email} admin huquqidan olib tashlandi`,
      });

      loadUsers();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast({
        title: "Xato",
        description: "Admin huquqini olib tashlashda xato",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Foydalanuvchilar Boshqaruvi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Admin Form */}
        <div className="flex gap-2">
          <Input
            placeholder="Email kiriting..."
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            disabled={isAddingAdmin}
          />
          <Button onClick={addAdmin} disabled={isAddingAdmin}>
            {isAddingAdmin ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Admin qo'shish</span>
          </Button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qo'shilgan</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Badge className="bg-primary">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("uz")}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.isAdmin && user.id !== currentUser?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ShieldOff className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Admin huquqini olib tashlash
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {user.email} foydalanuvchisidan admin huquqini olib
                              tashlamoqchimisiz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeAdmin(user.id, user.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Olib tashlash
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground">Siz</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Foydalanuvchilar yo'q
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
