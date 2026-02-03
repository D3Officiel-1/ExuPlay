
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  setDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  BarChart3, 
  Loader2, 
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function AdminPage() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const appConfigRef = useMemo(() => {
    if (!db) return null;
    return doc(db, "appConfig", "status");
  }, [db]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);
  const { data: appStatus } = useDoc(appConfigRef);
  
  const usersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);

  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if (profile.role !== 'admin') {
        router.push("/home");
        toast({
          variant: "destructive",
          title: "Accès refusé",
          description: "Seuls les administrateurs peuvent accéder à cette console."
        });
      }
    }
  }, [profile, profileLoading, authLoading, router, toast]);

  const handleToggleMaintenance = async (checked: boolean) => {
    if (!appConfigRef) return;
    try {
      await setDoc(appConfigRef, {
        maintenanceMode: checked,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({
        title: checked ? "Maintenance activée" : "Maintenance désactivée",
        description: checked ? "L'application est en mode privé." : "L'application est accessible à tous."
      });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: appConfigRef.path,
        operation: 'update',
        requestResourceData: { maintenanceMode: checked },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  if (authLoading || profileLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <Header />
      
      <main className="flex-1 p-4 pt-20 space-y-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/profil")}
            className="rounded-full h-8 w-8 hover:bg-primary/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Administration</p>
            <h1 className="text-xl font-black tracking-tight">Console Quiz</h1>
          </div>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-11 rounded-xl grid grid-cols-3">
            <TabsTrigger value="stats" className="rounded-lg font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Système
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Esprits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[9px] font-black uppercase tracking-widest opacity-40">Joueurs</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-black">{users?.length || 0}</p>
                    <p className="text-[7px] font-bold opacity-40 mb-1">ACTIFS</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[9px] font-black uppercase tracking-widest opacity-40">Status</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm font-black uppercase">En Ligne</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border-none bg-primary text-primary-foreground shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 opacity-40" />
                <h3 className="text-lg font-black">Système Stable</h3>
                <p className="text-[10px] opacity-60 font-medium">Liaison établie avec l'éther numérique.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-black">Contrôle</CardTitle>
                <CardDescription className="text-[10px] font-medium">Gérez la visibilité globale.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-primary/5">
                  <div className="space-y-0.5">
                    <p className="font-black text-[10px] uppercase tracking-widest">Mode Maintenance</p>
                    <p className="text-[9px] opacity-60 font-medium">Désactive l'accès aux joueurs.</p>
                  </div>
                  <Switch 
                    checked={appStatus?.maintenanceMode || false} 
                    onCheckedChange={handleToggleMaintenance}
                    className="data-[state=checked]:bg-red-500 scale-90"
                  />
                </div>

                {appStatus?.maintenanceMode && (
                  <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10 flex gap-3 items-start">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-red-600">Maintenance Active</p>
                      <p className="text-[9px] leading-relaxed opacity-60 font-medium">
                        Seuls les administrateurs peuvent naviguer.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="font-black text-[8px] uppercase tracking-widest opacity-40 h-10 px-4">Joueur</TableHead>
                      <TableHead className="font-black text-[8px] uppercase tracking-widest opacity-40 h-10 px-4 text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-black text-xs tracking-tight">@{u.username}</span>
                            <span className="text-[7px] opacity-40 uppercase tracking-widest">
                              {u.phoneNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-black text-xs tabular-nums">
                          {u.totalPoints?.toLocaleString() || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
