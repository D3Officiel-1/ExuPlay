
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  serverTimestamp,
  query,
  orderBy, 
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  limit
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
  DialogTrigger,
  DialogFooter
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
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  MessageSquareText,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Save,
  Wand2,
  Calendar,
  Smartphone,
  Shield,
  Target,
  RefreshCw,
  Database,
  Banknote,
  Activity,
  Trophy,
  Copy,
  Filter,
  Megaphone,
  Percent,
  Lock,
  ArrowRightLeft,
  Crown,
  Minus,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { generateQuiz } from "@/ai/flows/generate-quiz-flow";
import { haptic } from "@/lib/haptics";
import { 
  Tooltip, 
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

  const [newQuiz, setNewQuiz] = useState({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    points: 10
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [selectedQuizForView, setSelectedQuizForView] = useState<any | null>(null);
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState<any>(null);

  const [selectedUserForView, setSelectedUserForView] = useState<any | null>(null);
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

  const [quizSearch, setQuizSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [pointsFilter, setPointsFilter] = useState("all");

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

  const quizzesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
  }, [db]);

  const exchangesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "exchanges"), orderBy("requestedAt", "desc"));
  }, [db]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);
  const { data: quizzes, loading: quizzesLoading } = useCollection(quizzesQuery);
  const { data: exchanges, loading: exchangesLoading } = useCollection(exchangesQuery);

  const globalMetrics = useMemo(() => {
    if (!users || !quizzes || !exchanges) return { totalUsers: 0, totalPoints: 0, totalQuizzes: 0, pendingExchanges: 0, totalExchangedFCFA: 0 };
    
    const totalUsers = users.length;
    const totalQuizzes = quizzes.length;
    const totalPoints = users.reduce((acc, u) => acc + (u.totalPoints || 0), 0);
    const pendingExchanges = exchanges.filter(e => e.status === 'pending').length;
    const totalExchangedFCFA = exchanges.filter(e => e.status === 'completed').reduce((acc, e) => acc + (e.amount || 0), 0);

    return { totalUsers, totalPoints, totalQuizzes, pendingExchanges, totalExchangedFCFA };
  }, [users, quizzes, exchanges]);

  const topSpirits = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 5);
  }, [users]);

  useEffect(() => {
    if (appStatus) {
      if (appStatus.maintenanceMessage !== undefined) setMaintenanceMessageInput(appStatus.maintenanceMessage);
      if (appStatus.globalAnnouncement !== undefined) setGlobalAnnouncementInput(appStatus.globalAnnouncement);
      if (appStatus.communityGoalTarget !== undefined) setCommunityTargetInput(appStatus.communityGoalTarget.toString());
      if (appStatus.pointConversionRate !== undefined) setConversionRateInput(appStatus.pointConversionRate.toString());
      if (appStatus.transferFeePercent !== undefined) setTransferFeeInput(appStatus.transferFeePercent.toString());
      if (appStatus.exchangeFeePercent !== undefined) setExchangeFeeInput(appStatus.exchangeFeePercent.toString());
      if (appStatus.dailyTransferLimitDefault !== undefined) setDefaultLimitInput(appStatus.dailyTransferLimitDefault.toString());
      if (appStatus.dailyTransferLimitTrusted !== undefined) setTrustedLimitInput(appStatus.dailyTransferLimitTrusted.toString());
    }
  }, [appStatus]);

  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return [];
    let result = quizzes;
    
    const q = quizSearch.toLowerCase().trim();
    if (q) {
      result = result.filter(quiz => quiz.question.toLowerCase().includes(q));
    }

    if (pointsFilter !== "all") {
      if (pointsFilter === "low") result = result.filter(quiz => quiz.points <= 3);
      else if (pointsFilter === "med") result = result.filter(quiz => quiz.points > 3 && quiz.points <= 7);
      else if (pointsFilter === "high") result = result.filter(quiz => quiz.points > 7);
    }

    return result;
  }, [quizzes, quizSearch, pointsFilter]);

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

  const handleToggleMaintenance = async (checked: boolean) => {
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

  const handleToggleExchange = async (checked: boolean) => {
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

  const handleUpdateConfig = async () => {
    if (!appConfigRef) return;
    setIsSavingConfig(true);
    haptic.light();
    try {
      await updateDoc(appConfigRef, {
        maintenanceMessage: maintenanceMessageInput,
        globalAnnouncement: globalAnnouncementInput,
        communityGoalTarget: parseInt(communityTargetInput) || 10000,
        pointConversionRate: parseFloat(conversionRateInput) || 0.5,
        transferFeePercent: parseInt(transferFeeInput) || 10,
        exchangeFeePercent: parseInt(exchangeFeeInput) || 1,
        dailyTransferLimitDefault: parseInt(defaultLimitInput) || 500,
        dailyTransferLimitTrusted: parseInt(trustedLimitInput) || 2500,
        updatedAt: serverTimestamp()
      });
      haptic.success();
      toast({ title: "Configuration harmonisée", description: "Les lois du Sanctuaire ont été mises à jour." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de la mise à jour." });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetGoal = async () => {
    if (!appConfigRef) return;
    setIsResettingGoal(true);
    haptic.medium();
    try {
      await updateDoc(appConfigRef, {
        communityGoalPoints: 0,
        royalChallengeActiveUntil: null,
        updatedAt: serverTimestamp()
      });
      haptic.success();
      toast({ title: "Cycle réinitialisé", description: "La jauge communautaire est revenue à zéro." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsResettingGoal(false);
    }
  };

  const handleAiGenerate = async (isForEdit: boolean = false) => {
    setIsGenerating(true);
    haptic.light();
    try {
      const result = await generateQuiz({});
      if (result) {
        if (isForEdit) {
          setEditedQuiz({
            ...editedQuiz,
            question: result.question,
            options: result.options,
            correctIndex: result.correctIndex,
            points: result.points
          });
        } else {
          setNewQuiz({
            question: result.question,
            options: result.options,
            correctIndex: result.correctIndex,
            points: result.points
          });
        }
        haptic.success();
      } else {
        haptic.error();
        toast({
          variant: "destructive",
          title: "Silence de l'Oracle",
          description: "Le flux de pensée est temporairement saturé. Réessayez dans quelques instants."
        });
      }
    } catch (error) {
      haptic.error();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || isSubmitting) return;
    
    if (newQuiz.question.trim() === "" || newQuiz.options.some(o => o.trim() === "")) {
      haptic.error();
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "quizzes"), {
        ...newQuiz,
        playedCount: 0,
        createdAt: serverTimestamp()
      });
      haptic.success();
      setNewQuiz({ question: "", options: ["", "", "", ""], correctIndex: 0, points: 10 });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateQuiz = async (e: React.MouseEvent, q: any) => {
    e.stopPropagation();
    if (!db) return;
    haptic.medium();
    try {
      await addDoc(collection(db, "quizzes"), {
        question: `${q.question} (Copie)`,
        options: [...q.options],
        correctIndex: q.correctIndex,
        points: q.points,
        playedCount: 0,
        createdAt: serverTimestamp()
      });
      toast({ title: "Défi dupliqué avec succès" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur de résonance" });
    }
  };

  const handleSelectQuiz = (q: any) => {
    haptic.light();
    setSelectedQuizForView(q);
    setIsEditingQuiz(false);
  };

  const handleStartEdit = () => {
    haptic.light();
    setEditedQuiz({ ...selectedQuizForView });
    setIsEditingQuiz(true);
  };

  const handleSaveEdit = async () => {
    if (!db || !selectedQuizForView?.id || !editedQuiz || isSubmitting) return;
    
    setIsSubmitting(true);
    haptic.medium();
    try {
      const quizRef = doc(db, "quizzes", selectedQuizForView.id);
      await updateDoc(quizRef, {
        question: editedQuiz.question,
        options: editedQuiz.options,
        correctIndex: editedQuiz.correctIndex,
        points: editedQuiz.points,
        updatedAt: serverTimestamp()
      });
      haptic.success();
      setSelectedQuizForView({ ...editedQuiz, id: selectedQuizForView.id });
      setIsEditingQuiz(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectUser = (u: any) => {
    haptic.light();
    setSelectedUserForView(u);
  };

  const handleUpdateUserField = async (userId: string, field: string, value: any) => {
    if (!db || isUpdatingUser) return;
    setIsUpdatingUser(true);
    haptic.medium();
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [field]: value,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Essence harmonisée", description: "La modification a été ancrée." });
      // Mettre à jour l'état local du dialogue si nécessaire
      setSelectedUserForView({ ...selectedUserForView, [field]: value });
    } catch (error) {
      toast({ variant: "destructive", title: "Dissonance", description: "Échec de la modification." });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleAdjustPoints = async (userId: string, amount: number) => {
    if (!db || isUpdatingUser) return;
    setIsUpdatingUser(true);
    haptic.medium();
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        totalPoints: increment(amount),
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: amount > 0 ? "Lumière insufflée" : "Lumière drainée", 
        description: `${Math.abs(amount)} PTS ont été ${amount > 0 ? 'ajoutés' : 'retirés'}.` 
      });
      setSelectedUserForView({ ...selectedUserForView, totalPoints: (selectedUserForView.totalPoints || 0) + amount });
    } catch (error) {
      toast({ variant: "destructive", title: "Dissonance" });
    } finally {
      setIsUpdatingUser(false);
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
          <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-12 md:h-14 rounded-2xl grid grid-cols-4">
            <TabsTrigger value="stats" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <BarChart3 className="h-4 w-4 mr-2" /> Stats
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-2" /> Défis
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <Settings2 className="h-4 w-4 mr-2" /> Système
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-black text-xs uppercase tracking-wider">
              <Users className="h-4 w-4 mr-2" /> Esprits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Esprits", value: globalMetrics.totalUsers, icon: Users, color: "text-blue-500" },
                { label: "Lumière", value: globalMetrics.totalPoints.toLocaleString(), icon: Zap, color: "text-yellow-500" },
                { label: "Savoir", value: globalMetrics.totalQuizzes, icon: Database, color: "text-purple-500" },
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

          <TabsContent value="quizzes" className="space-y-6 md:space-y-8">
            <div className="flex flex-col gap-6 px-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Base de Données</h3>
                  <div className="bg-primary/5 px-2 py-0.5 rounded-full border border-primary/5">
                    <span className="text-[10px] font-black text-primary">{quizzes?.length || 0} DÉFIS</span>
                  </div>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => haptic.light()} className="h-10 px-4 rounded-2xl font-black text-xs uppercase tracking-widest gap-2">
                      <Plus className="h-4 w-4" /> Nouveau défi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-2xl rounded-[2.5rem] p-8 border-none">
                    <DialogHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <DialogTitle className="text-2xl font-black tracking-tight">Nouveau Défi</DialogTitle>
                          <p className="text-sm font-medium opacity-60">Créez une nouvelle épreuve.</p>
                        </div>
                        <Button type="button" variant="secondary" onClick={() => handleAiGenerate(false)} disabled={isGenerating} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase gap-2 bg-primary/5">
                          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                          IA
                        </Button>
                      </div>
                    </DialogHeader>
                    <form onSubmit={handleAddQuiz} className="space-y-6 pt-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest opacity-40">La Question</Label>
                        <Textarea placeholder="Ex: Quelle est l'essence du désir ?" className="min-h-[100px] rounded-2xl" value={newQuiz.question} onChange={e => setNewQuiz({...newQuiz, question: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {newQuiz.options.map((opt, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-black uppercase tracking-widest opacity-40">Option {idx + 1}</Label>
                              <input type="radio" name="correct" checked={newQuiz.correctIndex === idx} onChange={() => { haptic.light(); setNewQuiz({...newQuiz, correctIndex: idx}); }} />
                            </div>
                            <Input placeholder={`Réponse ${idx + 1}`} className="h-12 rounded-xl" value={opt} onChange={e => {
                              const newOpts = [...newQuiz.options];
                              newOpts[idx] = e.target.value;
                              setNewQuiz({...newQuiz, options: newOpts});
                            }} />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest opacity-40">Points (0-10)</Label>
                        <Input type="number" min="0" max="10" className="h-12 rounded-xl" value={newQuiz.points} onChange={e => setNewQuiz({...newQuiz, points: parseInt(e.target.value) || 0})} />
                      </div>
                      <DialogFooter className="pt-6">
                        <Button type="submit" disabled={isSubmitting || isGenerating} className="w-full h-14 rounded-2xl font-black text-sm uppercase shadow-xl">
                          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publier le défi"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                  <Input placeholder="Rechercher une question..." className="pl-12 h-12 bg-card/20 border-none rounded-2xl" value={quizSearch} onChange={(e) => setQuizSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Filter className="h-4 w-4 opacity-40 shrink-0" />
                  <Select value={pointsFilter} onValueChange={setPointsFilter}>
                    <SelectTrigger className="h-12 rounded-2xl bg-card/20 border-none px-6 font-bold">
                      <SelectValue placeholder="Difficulté" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-2xl rounded-2xl border-primary/5">
                      <SelectItem value="all" className="font-bold">Toute intensité</SelectItem>
                      <SelectItem value="low" className="font-bold text-blue-500">Faible (0-3 PTS)</SelectItem>
                      <SelectItem value="med" className="font-bold text-yellow-500">Modérée (4-7 PTS)</SelectItem>
                      <SelectItem value="high" className="font-bold text-red-500">Élevée (8-10 PTS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {quizzesLoading ? <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div> : (
                <div className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredQuizzes.map(q => {
                      const difficultyColor = q.points <= 3 ? "text-blue-500" : q.points <= 7 ? "text-yellow-500" : "text-red-500";
                      return (
                        <motion.div
                          key={q.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <Card 
                            onClick={() => handleSelectQuiz(q)}
                            className="border-none bg-card/20 backdrop-blur-3xl rounded-2xl group hover:bg-card/40 transition-all cursor-pointer overflow-hidden relative"
                          >
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1", difficultyColor.replace('text-', 'bg-'))} />
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                              <div className="space-y-1 flex-1 overflow-hidden ml-2">
                                <p className="text-sm font-black line-clamp-2">{q.question}</p>
                                <div className="flex items-center gap-3">
                                  <div className={cn("flex items-center gap-1 font-black text-[9px] uppercase", difficultyColor)}>
                                    <Zap className="h-3 w-3" />
                                    {q.points} PTS
                                  </div>
                                  <span className="text-[9px] font-bold opacity-30 uppercase">{q.playedCount || 0} RÉSONANCES</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => handleDuplicateQuiz(e, q)}
                                  className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-primary/5"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { e.stopPropagation(); haptic.medium(); deleteDoc(doc(db, "quizzes", q.id)); }} 
                                  className="h-10 w-10 text-destructive rounded-xl hover:bg-destructive/5"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {filteredQuizzes.length === 0 && (
                    <div className="py-20 text-center opacity-20 space-y-4">
                      <Search className="h-12 w-12 mx-auto" />
                      <p className="text-xs font-black uppercase tracking-widest">Aucun défi ne résonne ici</p>
                    </div>
                  )}
                </div>
              )}
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
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Voix de l'Oracle</h3>
                  </div>
                  <div className="space-y-2 px-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Annonce Globale</Label>
                    <Input 
                      placeholder="Message diffusé à tous les esprits (laisser vide pour masquer)..." 
                      className="h-12 rounded-xl bg-background/50 border-primary/10 font-bold"
                      value={globalAnnouncementInput}
                      onChange={(e) => setGlobalAnnouncementInput(e.target.value)}
                    />
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

      <Dialog open={!!selectedQuizForView} onOpenChange={(open) => !open && (setSelectedQuizForView(null), setIsEditingQuiz(false))}>
        <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto border-none">
          <DialogHeader>
            <div className="flex justify-between items-center w-full">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {isEditingQuiz ? "Édition du Défi" : "Fiche d'Épreuve"}
                </p>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {isEditingQuiz ? "Harmonisation" : "Détails du Défi"}
                </DialogTitle>
              </div>
              {isEditingQuiz && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => handleAiGenerate(true)} 
                  disabled={isGenerating} 
                  className="h-10 px-4 rounded-xl font-black text-[10px] uppercase gap-2 bg-primary/5 shrink-0"
                >
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                  Inspiration IA
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedQuizForView && (
            <div className="space-y-8 py-6">
              <AnimatePresence mode="wait">
                {isEditingQuiz ? (
                  <motion.div 
                    key="edit-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">La Question</Label>
                      <div className="relative">
                        <Textarea 
                          className="min-h-[120px] rounded-2xl bg-primary/5 border-none text-lg font-bold p-6 pr-12"
                          value={editedQuiz?.question}
                          onChange={e => setEditedQuiz({...editedQuiz, question: e.target.value})}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleAiGenerate(true)} 
                          disabled={isGenerating}
                          className="absolute right-4 bottom-4 h-8 w-8 rounded-lg bg-background shadow-sm border border-primary/5"
                        >
                          <Wand2 className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Options de Résonance</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {editedQuiz?.options.map((opt: string, idx: number) => {
                          return (
                            <div key={idx} className="relative group">
                              <Input 
                                className={`h-14 rounded-2xl bg-primary/5 border-none pl-12 font-bold ${editedQuiz.correctIndex === idx ? 'ring-2 ring-green-500/30' : ''}`}
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...editedQuiz.options];
                                  newOpts[idx] = e.target.value;
                                  setEditedQuiz({...editedQuiz, options: newOpts});
                                }}
                              />
                              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <input 
                                  type="radio" 
                                  name="edit-correct" 
                                  checked={editedQuiz.correctIndex === idx} 
                                  onChange={() => { haptic.light(); setEditedQuiz({...editedQuiz, correctIndex: idx}); }}
                                  className="h-4 w-4 accent-primary"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Points (0-10)</Label>
                      <Input 
                        type="number"
                        min="0"
                        max="10"
                        className="h-14 rounded-2xl bg-primary/5 border-none font-black text-xl text-center"
                        value={editedQuiz?.points}
                        onChange={e => setEditedQuiz({...editedQuiz, points: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="view-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                  >
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5 shadow-inner">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">La Question</p>
                      <p className="text-xl font-black leading-tight tracking-tight">{selectedQuizForView.question}</p>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Options de Résonance</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedQuizForView.options.map((opt: string, idx: number) => {
                          const isCorrect = idx === selectedQuizForView.correctIndex;
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                isCorrect 
                                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" 
                                  : "bg-background/40 border-primary/5 opacity-60"
                              }`}
                            >
                              {isCorrect ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <Circle className="h-5 w-5 shrink-0 opacity-20" />}
                              <span className="font-bold text-sm leading-tight">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-background rounded-[2rem] border border-primary/5 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Récompense</p>
                          <p className="text-lg font-black">{selectedQuizForView.points} PTS <span className="text-[10px] opacity-30 tracking-normal">de Lumière</span></p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleDuplicateQuiz(e, selectedQuizForView)}
                          className="h-12 w-12 rounded-2xl hover:bg-primary/5"
                        >
                          <Copy className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            haptic.medium();
                            deleteDoc(doc(db, "quizzes", selectedQuizForView.id));
                            setSelectedQuizForView(null);
                          }}
                          className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            {isEditingQuiz ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditingQuiz(false)}
                  className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || isGenerating}
                  className="flex-[2] h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Sauvegarder
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedQuizForView(null)}
                  className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Fermer
                </Button>
                <Button 
                  onClick={handleStartEdit}
                  className="flex-[2] h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl shadow-primary/20"
                >
                  <Edit3 className="h-4 w-4" /> Modifier le défi
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                      <Select 
                        value={selectedUserForView.role || 'user'} 
                        onValueChange={(val) => handleUpdateUserField(selectedUserForView.id, 'role', val)}
                        disabled={isUpdatingUser}
                      >
                        <SelectTrigger className="w-32 h-10 rounded-xl bg-background border-none font-black text-[10px] uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-primary/5 rounded-xl">
                          <SelectItem value="user" className="font-bold text-[10px] uppercase">Adepte</SelectItem>
                          <SelectItem value="admin" className="font-bold text-[10px] uppercase">Maître</SelectItem>
                        </SelectContent>
                      </Select>
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
