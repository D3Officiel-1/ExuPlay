"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  serverTimestamp,
  query,
  orderBy, 
  updateDoc,
  setDoc,
  increment,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  BarChart3, 
  Loader2, 
  ChevronLeft,
  Settings2,
  Search,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Save,
  Calendar,
  Smartphone,
  Shield,
  RefreshCw,
  Activity,
  Trophy,
  Megaphone,
  Percent,
  Lock,
  ArrowRightLeft,
  Crown,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { haptic } from "@/lib/haptics";
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis
} from 'recharts';
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getHonorTitle } from "@/lib/titles";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  
  // États Système
  const [maintenanceMessageInput, setMaintenanceMessageInput] = useState("");
  const [globalAnnouncementInput, setGlobalAnnouncementInput] = useState("");
  const [communityTargetInput, setCommunityTargetInput] = useState("");
  const [conversionRateInput, setConversionRateInput] = useState("0.5");
  const [transferFeeInput, setTransferFeeInput] = useState("10");
  const [exchangeFeeInput, setExchangeFeeInput] = useState("1");
  const [defaultLimitInput, setDefaultLimitInput] = useState("500");
  const [trustedLimitInput, setTrustedLimitInput] = useState("2500");
  
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isResettingGoal, setIsResettingGoal] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [selectedUserForView, setSelectedUserForView] = useState<any | null>(null);

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

  const exchangesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "exchanges"), orderBy("requestedAt", "desc"));
  }, [db]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);
  const { data: exchanges, loading: exchangesLoading } = useCollection(exchangesQuery);

  const globalMetrics = useMemo(() => {
    if (!users || !exchanges) return { totalUsers: 0, totalPoints: 0, pendingExchanges: 0, totalExchangedFCFA: 0 };
    
    const totalUsers = users.length;
    const totalPoints = users.reduce((acc, u) => acc + (u.totalPoints || 0), 0);
    const pendingExchanges = exchanges.filter(e => e.status === 'pending').length;
    const totalExchangedFCFA = exchanges.filter(e => e.status === 'completed').reduce((acc, e) => acc + (e.amount || 0), 0);

    return { totalUsers, totalPoints, pendingExchanges, totalExchangedFCFA };
  }, [users, exchanges]);

  const topSpirits = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 5);
  }, [users]);

  useEffect(() => {
    if (appStatus) {
      if (appStatus.maintenanceMessage !== undefined) setMaintenanceMessageInput(appStatus.maintenanceMessage || "");
      if (appStatus.globalAnnouncement !== undefined) setGlobalAnnouncementInput(appStatus.globalAnnouncement || "");
      if (appStatus.communityGoalTarget !== undefined) setCommunityTargetInput(appStatus.communityGoalTarget.toString());
      if (appStatus.pointConversionRate !== undefined) setConversionRateInput(appStatus.pointConversionRate.toString());
      if (appStatus.transferFeePercent !== undefined) setTransferFeeInput(appStatus.transferFeePercent.toString());
      if (appStatus.exchangeFeePercent !== undefined) setExchangeFeeInput(appStatus.exchangeFeePercent.toString());
      if (appStatus.dailyTransferLimitDefault !== undefined) setDefaultLimitInput(appStatus.dailyTransferLimitDefault.toString());
      if (appStatus.dailyTransferLimitTrusted !== undefined) setTrustedLimitInput(appStatus.dailyTransferLimitTrusted.toString());
    }
  }, [appStatus]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(user => 
      user.username.toLowerCase().includes(q) || 
      user.phoneNumber?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const chartData = useMemo(() => {
    if (!users) return [];
    const groups: Record<string, number> = {};
    users.slice(0, 20).reverse().forEach(u => {
      const date = u.createdAt ? new Date(u.createdAt.toDate()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'N/A';
      groups[date] = (groups[date] || 0) + 1;
    });
    return Object.entries(groups).map(([date, count]) => ({ date, count }));
  }, [users]);

  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if (profile.role !== 'admin') {
        router.push("/profil");
      }
    }
  }, [profile, profileLoading, authLoading, router]);

  const handleToggleMaintenance = (checked: boolean) => {
    if (!appConfigRef) return;
    haptic.medium();
    updateDoc(appConfigRef, {
      maintenanceMode: checked,
      updatedAt: serverTimestamp()
    }).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: appConfigRef.path,
        operation: 'update',
        requestResourceData: { maintenanceMode: checked },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleToggleExchange = (checked: boolean) => {
    if (!appConfigRef) return;
    haptic.medium();
    updateDoc(appConfigRef, {
      exchangeEnabled: checked,
      updatedAt: serverTimestamp()
    }).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: appConfigRef.path,
        operation: 'update',
        requestResourceData: { exchangeEnabled: checked },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleUpdateConfig = () => {
    if (!appConfigRef) return;
    setIsSavingConfig(true);
    haptic.light();
    
    const configData = {
      maintenanceMessage: maintenanceMessageInput.trim(),
      globalAnnouncement: globalAnnouncementInput.trim(),
      communityGoalTarget: parseInt(communityTargetInput) || 10000,
      pointConversionRate: parseFloat(conversionRateInput) || 0.5,
      transferFeePercent: parseInt(transferFeeInput) || 10,
      exchangeFeePercent: parseInt(exchangeFeeInput) || 1,
      dailyTransferLimitDefault: parseInt(defaultLimitInput) || 500,
      dailyTransferLimitTrusted: parseInt(trustedLimitInput) || 2500,
      updatedAt: serverTimestamp()
    };

    setDoc(appConfigRef, configData, { merge: true })
    .then(() => {
      haptic.success();
      toast({ title: "Configuration harmonisée", description: "Les lois du Sanctuaire ont été mises à jour." });
    })
    .catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: appConfigRef.path,
        operation: 'update',
        requestResourceData: configData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsSavingConfig(false);
    });
  };

  const handleResetGoal = () => {
    if (!appConfigRef) return;
    setIsResettingGoal(true);
    haptic.medium();
    updateDoc(appConfigRef, {
      communityGoalPoints: 0,
      royalChallengeActiveUntil: null,
      updatedAt: serverTimestamp()
    })
    .then(() => {
      haptic.success();
      toast({ title: "Cycle réinitialisé", description: "La jauge communautaire est revenue à zéro." });
    })
    .catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: appConfigRef.path,
        operation: 'update',
        requestResourceData: { communityGoalPoints: 0 },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsResettingGoal(false);
    });
  };

  const handleSelectUser = (u: any) => {
    haptic.light();
    setSelectedUserForView(u);
  };

  const handleUpdateUserField = (userId: string, field: string, value: any) => {
    if (!db || isUpdatingUser) return;
    setIsUpdatingUser(true);
    haptic.medium();
    
    const userRef = doc(db, "users", userId);
    updateDoc(userRef, {
      [field]: value,
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({ title: "Essence harmonisée", description: "La modification a été ancrée." });
      setSelectedUserForView((prev: any) => prev ? { ...prev, [field]: value } : null);
    })
    .catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { [field]: value },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsUpdatingUser(false);
    });
  };

  const handleAdjustPoints = (userId: string, amount: number) => {
    if (!db || isUpdatingUser) return;
    setIsUpdatingUser(true);
    haptic.medium();
    
    const userRef = doc(db, "users", userId);
    updateDoc(userRef, {
      totalPoints: increment(amount),
      updatedAt: serverTimestamp()
    })
    .then(() => {
      toast({ 
        title: amount > 0 ? "Lumière insufflée" : "Lumière drainée", 
        description: `${Math.abs(amount)} PTS ont été ${amount > 0 ? 'ajoutés' : 'retirés'}.` 
      });
      setSelectedUserForView((prev: any) => prev ? { ...prev, totalPoints: (prev.totalPoints || 0) + amount } : null);
    })
    .catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { totalPoints: `increment ${amount}` },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
      setIsUpdatingUser(false);
    });
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
      <main className="flex-1 p-4 pt-20 space-y-6 md:space-y-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/profil")} className="rounded-full h-10 w-10 md:h-12 md:w-12">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="space-y-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Console</p>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Espace Maître</h1>
            </div>
          </div>
          
          <Button 
            onClick={() => { haptic.light(); router.push("/admin/conversions"); }}
            className="rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-primary/10"
          >
            <ArrowUpRight className="h-4 w-4" />
            Retraits
          </Button>
        </div>

        <Tabs defaultValue="stats" className="space-y-6 md:space-y-8">
          <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-12 md:h-14 rounded-2xl grid grid-cols-3">
            <TabsTrigger value="stats" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <BarChart3 className="h-4 w-4 mr-2" /> Stats
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <Settings2 className="h-4 w-4 mr-2" /> Système
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <Users className="h-4 w-4 mr-2" /> Esprits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Esprits", value: globalMetrics.totalUsers, icon: Users, color: "text-blue-500" },
                { label: "Lumière", value: globalMetrics.totalPoints.toLocaleString(), icon: Zap, color: "text-yellow-500" },
                { label: "Retraits", value: globalMetrics.pendingExchanges, icon: Banknote, color: "text-orange-500" }
              ].map((m, i) => (
                <Card key={i} className="border-none bg-card/40 backdrop-blur-3xl rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center space-y-2">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-primary/5", m.color)}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{m.label}</p>
                    <p className="text-xl font-black tracking-tighter">{m.value}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem]">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-40">Flux des Esprits</CardTitle>
                    <Activity className="h-4 w-4 opacity-20" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" x1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem]">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-40">Maîtres de la Lumière</CardTitle>
                    <Trophy className="h-4 w-4 opacity-20 text-yellow-500" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {topSpirits.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-background/40 rounded-xl border border-primary/5">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black opacity-20">#{i+1}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-black">@{u.username}</span>
                          <span className="text-[8px] opacity-40 uppercase font-bold">{getHonorTitle(u.totalPoints).name}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary">{u.totalPoints?.toLocaleString()} PTS</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-8">
            <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black">Lois du Sanctuaire</CardTitle>
                <CardDescription className="text-sm">Définissez la structure de la réalité éthérée.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-10">
                
                {/* Section Accès */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pl-2">
                    <Lock className="h-4 w-4 opacity-40" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Accès & Maintenance</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-6 bg-background/50 rounded-3xl border border-primary/5">
                      <div className="space-y-1">
                        <p className="font-black text-sm uppercase tracking-widest">Maintenance</p>
                        <p className="text-[10px] opacity-40 font-medium italic">Fermeture du portail</p>
                      </div>
                      <Switch checked={appStatus?.maintenanceMode || false} onCheckedChange={handleToggleMaintenance} className="scale-110" />
                    </div>

                    <div className="flex items-center justify-between p-6 bg-background/50 rounded-3xl border border-primary/5">
                      <div className="space-y-1">
                        <p className="font-black text-sm uppercase tracking-widest">Flux de Retrait</p>
                        <p className="text-[10px] opacity-40 font-medium italic">Conversion en liquidité</p>
                      </div>
                      <Switch checked={appStatus?.exchangeEnabled || false} onCheckedChange={handleToggleExchange} className="scale-110" />
                    </div>
                  </div>
                  <div className="space-y-2 px-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Message de Maintenance</Label>
                    <Textarea 
                      placeholder="Message affiché lors de la maintenance..." 
                      className="min-h-[80px] rounded-2xl bg-background/50 border-primary/10"
                      value={maintenanceMessageInput}
                      onChange={(e) => setMaintenanceMessageInput(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section Annonces */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pl-2">
                    <Megaphone className="h-4 w-4 opacity-40" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Voix de l'Oracle (Annonce Globale)</h3>
                  </div>
                  <div className="space-y-2 px-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Texte de l'annonce</Label>
                    <div className="relative">
                      <Input 
                        placeholder="Message diffusé à tous les esprits (laisser vide pour masquer)..." 
                        className="h-12 rounded-xl bg-background/50 border-primary/10 font-bold pr-10"
                        value={globalAnnouncementInput}
                        onChange={(e) => setGlobalAnnouncementInput(e.target.value)}
                      />
                      {globalAnnouncementInput && (
                        <button 
                          onClick={() => { haptic.light(); setGlobalAnnouncementInput(""); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive opacity-40 hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Économie */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pl-2">
                    <Percent className="h-4 w-4 opacity-40" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Lois Économiques</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 p-4 bg-background/50 rounded-2xl border border-primary/5">
                      <Label className="text-[9px] font-black uppercase opacity-40">Taux (1 PTS = X FCFA)</Label>
                      <Input type="number" step="0.1" value={conversionRateInput} onChange={e => setConversionRateInput(e.target.value)} className="h-10 rounded-lg bg-background font-bold text-center" />
                    </div>
                    <div className="space-y-2 p-4 bg-background/50 rounded-2xl border border-primary/5">
                      <Label className="text-[9px] font-black uppercase opacity-40">Taxe Transfert (%)</Label>
                      <Input type="number" value={transferFeeInput} onChange={e => setTransferFeeInput(e.target.value)} className="h-10 rounded-lg bg-background font-bold text-center" />
                    </div>
                    <div className="space-y-2 p-4 bg-background/50 rounded-2xl border border-primary/5">
                      <Label className="text-[9px] font-black uppercase opacity-40">Frais Retrait (%)</Label>
                      <Input type="number" value={exchangeFeeInput} onChange={e => setExchangeFeeInput(e.target.value)} className="h-10 rounded-lg bg-background font-bold text-center" />
                    </div>
                  </div>
                </div>

                {/* Section Limites & Objectifs */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pl-2">
                    <ArrowRightLeft className="h-4 w-4 opacity-40" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Flux & Limites Quotidiens</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 bg-background/50 rounded-2xl border border-primary/5">
                      <Label className="text-[9px] font-black uppercase opacity-40">Limite Standard (PTS)</Label>
                      <Input type="number" value={defaultLimitInput} onChange={e => setDefaultLimitInput(e.target.value)} className="h-10 rounded-lg bg-background font-bold text-center" />
                    </div>
                    <div className="space-y-2 p-4 bg-background/50 rounded-2xl border border-primary/5">
                      <Label className="text-[9px] font-black uppercase opacity-40">Limite Sceau de Confiance (PTS)</Label>
                      <Input type="number" value={trustedLimitInput} onChange={e => setTrustedLimitInput(e.target.value)} className="h-10 rounded-lg bg-background font-bold text-center" />
                    </div>
                  </div>

                  <div className="space-y-2 p-6 bg-background/50 rounded-3xl border border-primary/5">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Objectif Communautaire (Cible)</Label>
                    <div className="flex gap-3">
                      <Input 
                        type="number"
                        placeholder="Ex: 10000" 
                        className="h-12 rounded-xl bg-background/50 border-primary/10 flex-1 font-bold"
                        value={communityTargetInput}
                        onChange={(e) => setCommunityTargetInput(e.target.value)}
                      />
                      <Button 
                        variant="outline"
                        onClick={handleResetGoal} 
                        disabled={isResettingGoal}
                        className="h-12 rounded-xl px-4 gap-2 border-primary/10 font-black text-[10px] uppercase"
                      >
                        {isResettingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateConfig} 
                  disabled={isSavingConfig}
                  className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-2xl shadow-primary/20"
                >
                  {isSavingConfig ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Énoncer les Nouvelles Lois
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="px-1 mb-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
              <Input placeholder="Rechercher un esprit..." className="pl-12 h-12 bg-card/20 border-none rounded-2xl" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/5">
                    <TableHead className="font-black text-xs uppercase px-6">Esprit</TableHead>
                    <TableHead className="font-black text-xs uppercase px-6 text-right">Lumière</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const title = getHonorTitle(u.totalPoints || 0);
                    const isAdmin = u.role === 'admin';
                    const isTrusted = u.trustBadge === true;

                    return (
                      <TableRow 
                        key={u.id} 
                        onClick={() => handleSelectUser(u)}
                        className="border-primary/5 hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar imageUrl={u.profileImage} points={u.totalPoints} isTrusted={isTrusted} size="sm" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm">@{u.username}</span>
                                {isAdmin && <Crown className="h-3 w-3 text-yellow-500" />}
                              </div>
                              <div className="flex items-center gap-1 opacity-40">
                                <Shield className={cn("h-2.5 w-2.5", title.color)} />
                                <span className={cn("text-[8px] font-black uppercase tracking-widest", title.color)}>{title.name}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right font-black text-sm">{u.totalPoints?.toLocaleString() || 0} PTS</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedUserForView} onOpenChange={(open) => !open && setSelectedUserForView(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto border-none">
          <DialogHeader>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Fiche d'Essence</p>
              <DialogTitle className="text-2xl font-black tracking-tight">Détails de l'Esprit</DialogTitle>
            </div>
          </DialogHeader>

          {selectedUserForView && (
            <div className="space-y-8 py-6">
              <div className="flex flex-col items-center gap-4">
                <ProfileAvatar 
                  imageUrl={selectedUserForView.profileImage} 
                  points={selectedUserForView.totalPoints || 0} 
                  isTrusted={selectedUserForView.trustBadge}
                  size="xl" 
                />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-xl font-black">@{selectedUserForView.username}</h3>
                    {selectedUserForView.role === 'admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-[0.3em] mt-2",
                    getHonorTitle(selectedUserForView.totalPoints || 0).color
                  )}>
                    Rang: {getHonorTitle(selectedUserForView.totalPoints || 0).name}
                  </p>
                </div>
              </div>

              {/* Commandement de l'Esprit */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pl-2">
                  <ShieldCheck className="h-4 w-4 opacity-40" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Commandement</h3>
                </div>
                <Card className="border-none bg-primary/5 rounded-[2rem] overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Trust Badge Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-black">Sceau de Confiance</p>
                        <p className="text-[10px] opacity-40">Élargit les limites de flux</p>
                      </div>
                      <Switch 
                        checked={selectedUserForView.trustBadge || false} 
                        onCheckedChange={(checked) => handleUpdateUserField(selectedUserForView.id, 'trustBadge', checked)}
                        disabled={isUpdatingUser}
                      />
                    </div>

                    <div className="h-px bg-primary/5" />

                    {/* Role Selection */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-black">Rôle Hiérarchique</p>
                        <p className="text-[10px] opacity-40">Pouvoirs administratifs</p>
                      </div>
                      <select 
                        value={selectedUserForView.role || 'user'} 
                        onChange={(e) => handleUpdateUserField(selectedUserForView.id, 'role', e.target.value)}
                        disabled={isUpdatingUser}
                        className="w-32 h-10 rounded-xl bg-background border-none font-black text-[10px] uppercase outline-none px-3"
                      >
                        <option value="user">Adepte</option>
                        <option value="admin">Maître</option>
                      </select>
                    </div>

                    <div className="h-px bg-primary/5" />

                    {/* Quick Points Adjustment */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Manipulation de Lumière</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleAdjustPoints(selectedUserForView.id, -100)} disabled={isUpdatingUser} className="flex-1 h-10 rounded-xl border-destructive/10 text-destructive hover:bg-destructive/5 font-black text-[10px]">
                            -100
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleAdjustPoints(selectedUserForView.id, -500)} disabled={isUpdatingUser} className="flex-1 h-10 rounded-xl border-destructive/10 text-destructive hover:bg-destructive/5 font-black text-[10px]">
                            -500
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleAdjustPoints(selectedUserForView.id, 100)} disabled={isUpdatingUser} className="flex-1 h-10 rounded-xl border-primary/10 text-primary hover:bg-primary/5 font-black text-[10px]">
                            +100
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleAdjustPoints(selectedUserForView.id, 500)} disabled={isUpdatingUser} className="flex-1 h-10 rounded-xl border-primary/10 text-primary hover:bg-primary/5 font-black text-[10px]">
                            +500
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-background border border-primary/5 rounded-[2rem] space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Lumière Actuelle</p>
                  <p className="text-xl font-black">{selectedUserForView.totalPoints?.toLocaleString()} <span className="text-[10px] opacity-30">PTS</span></p>
                </div>
                <div className="p-5 bg-background border border-primary/5 rounded-[2rem] space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Parrainage</p>
                  <p className="text-xl font-black tracking-tighter">{selectedUserForView.referralCode || "---"}</p>
                </div>
              </div>

              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-40">
                    <Smartphone className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Liaison Wave</span>
                  </div>
                  <span className="text-xs font-bold">{selectedUserForView.phoneNumber || "Non lié"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-40">
                    <Calendar className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Éveil Initial</span>
                  </div>
                  <span className="text-xs font-bold">
                    {selectedUserForView.createdAt ? format(selectedUserForView.createdAt.toDate(), "dd MMMM yyyy", { locale: fr }) : "---"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedUserForView(null)}
              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Quitter la Fiche
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
