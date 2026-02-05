
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  setDoc,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users, 
  BarChart3, 
  Loader2, 
  ChevronLeft,
  Settings2,
  Plus,
  Trash2,
  Brain,
  Edit3,
  User,
  MinusCircle,
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Zap,
  MessageSquareText,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  X,
  Save,
  Wand2,
  Calendar,
  Smartphone,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { generateQuiz } from "@/ai/flows/generate-quiz-flow";
import { haptic } from "@/lib/haptics";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [newQuiz, setNewQuiz] = useState({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    points: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [selectedQuizForView, setSelectedQuizForView] = useState<any | null>(null);
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState<any>(null);

  const [selectedUserForView, setSelectedUserForView] = useState<any | null>(null);
  
  const [maintenanceMessageInput, setMaintenanceMessageInput] = useState("");
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  const [quizSearch, setQuizSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

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

  const transfersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "transfers"), orderBy("timestamp", "desc"), limit(20));
  }, [db]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);
  const { data: quizzes, loading: quizzesLoading } = useCollection(quizzesQuery);
  const { data: recentTransfers } = useCollection(transfersQuery);

  useEffect(() => {
    if (appStatus?.maintenanceMessage !== undefined) {
      setMaintenanceMessageInput(appStatus.maintenanceMessage);
    }
  }, [appStatus?.maintenanceMessage]);

  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return [];
    const q = quizSearch.toLowerCase().trim();
    if (!q) return quizzes;
    return quizzes.filter(quiz => quiz.question.toLowerCase().includes(q));
  }, [quizzes, quizSearch]);

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
    users.slice(0, 10).reverse().forEach(u => {
      const date = u.createdAt ? new Date(u.createdAt.toDate()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'N/A';
      groups[date] = (groups[date] || 0) + 1;
    });
    return Object.entries(groups).map(([date, count]) => ({ date, count }));
  }, [users]);

  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if (profile.role !== 'admin') {
        router.push("/profil");
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
    toast({
      title: checked ? "Maintenance activée" : "Maintenance désactivée",
      description: checked ? "L'application est en mode privé." : "L'application est accessible à tous."
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
    toast({
      title: checked ? "Échanges activés" : "Échanges suspendus",
      description: checked ? "Les esprits peuvent convertir leur lumière." : "Le système de conversion est verrouillé."
    });
  };

  const handleUpdateMaintenanceMessage = async () => {
    if (!appConfigRef) return;
    setIsSavingMessage(true);
    haptic.light();
    try {
      await updateDoc(appConfigRef, {
        maintenanceMessage: maintenanceMessageInput,
        updatedAt: serverTimestamp()
      });
      haptic.success();
      toast({ title: "Message mis à jour", description: "Le nouveau message est visible par les esprits." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le message." });
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleAiGenerate = async () => {
    setIsGenerating(true);
    haptic.light();
    try {
      const result = await generateQuiz({});
      setNewQuiz({
        question: result.question,
        options: result.options,
        correctIndex: result.correctIndex,
        points: result.points
      });
      haptic.success();
      toast({ title: "Défis généré", description: "L'IA a conçu une nouvelle épreuve philosophique." });
    } catch (error) {
      haptic.error();
      toast({ variant: "destructive", title: "Dissonance IA", description: "L'IA n'a pas pu concevoir de défi pour le moment." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || isSubmitting) return;
    
    if (newQuiz.question.trim() === "" || newQuiz.options.some(o => o.trim() === "")) {
      haptic.error();
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir tous les champs." });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "quizzes"), {
        ...newQuiz,
        createdAt: serverTimestamp()
      });
      haptic.success();
      setNewQuiz({ question: "", options: ["", "", "", ""], correctIndex: 0, points: 100 });
      setIsAddDialogOpen(false);
      toast({ title: "Défi ajouté", description: "La question a été publiée." });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
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

  const handleCancelEdit = () => {
    haptic.light();
    setIsEditingQuiz(false);
    setEditedQuiz(null);
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
      toast({ title: "Mise à jour réussie", description: "Le défi a été harmonisé." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Échec", description: "Impossible de sauvegarder les modifications." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiGenerateForEdit = async () => {
    setIsGenerating(true);
    haptic.light();
    try {
      const result = await generateQuiz({});
      setEditedQuiz({
        ...editedQuiz,
        question: result.question,
        options: result.options,
        correctIndex: result.correctIndex,
        points: result.points
      });
      haptic.success();
      toast({ title: "Réécriture IA", description: "Le défi a été transfiguré par l'Oracle." });
    } catch (error) {
      haptic.error();
      toast({ variant: "destructive", title: "Dissonance IA", description: "L'IA n'a pas pu s'exprimer." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectUser = (u: any) => {
    haptic.light();
    setSelectedUserForView(u);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem]">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-40">Flux des Esprits</CardTitle>
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
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '1rem', border: '1px solid hsl(var(--primary)/0.1)' }}
                        itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem]">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-40">Échanges Récents</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3 overflow-y-auto max-h-[180px]">
                  {recentTransfers?.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-background/40 rounded-xl border border-primary/5">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-primary opacity-40" />
                        <span className="text-[10px] font-bold truncate max-w-[80px]">@{t.fromName}</span>
                      </div>
                      <span className="text-[10px] font-black">+{t.amount} PTS</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6 md:space-y-8">
            <div className="flex flex-col gap-4 px-1">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Base de Données</h3>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => haptic.light()} className="h-10 px-4 rounded-2xl font-black text-xs uppercase tracking-widest gap-2">
                      <Plus className="h-4 w-4" /> Nouveau défi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto border-none">
                    <DialogHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <DialogTitle className="text-2xl font-black tracking-tight">Nouveau Défi</DialogTitle>
                          <p className="text-sm font-medium opacity-60">Créez ou générez une nouvelle épreuve.</p>
                        </div>
                        <Button type="button" variant="secondary" onClick={handleAiGenerate} disabled={isGenerating} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase gap-2 bg-primary/5">
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
                      <DialogFooter className="pt-6">
                        <Button type="submit" disabled={isSubmitting || isGenerating} className="w-full h-14 rounded-2xl font-black text-sm uppercase shadow-xl">
                          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publier le défi"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                <Input placeholder="Rechercher une question..." className="pl-12 h-12 bg-card/20 border-none rounded-2xl" value={quizSearch} onChange={(e) => setQuizSearch(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              {quizzesLoading ? <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div> : (
                <div className="grid gap-4">
                  {filteredQuizzes.map(q => (
                    <Card 
                      key={q.id} 
                      onClick={() => handleSelectQuiz(q)}
                      className="border-none bg-card/20 backdrop-blur-3xl rounded-2xl group hover:bg-card/40 transition-all cursor-pointer"
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1 flex-1 overflow-hidden">
                          <p className="text-sm font-black line-clamp-2">{q.question}</p>
                          <p className="text-[10px] font-bold opacity-30 uppercase">{q.points} PTS • {q.options.length} OPTIONS</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); haptic.medium(); deleteDoc(doc(db, "quizzes", q.id)); }} 
                          className="h-10 w-10 text-destructive rounded-xl"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black">Sécurité & Flux</CardTitle>
                <CardDescription className="text-sm">Gérez l'accès et les échanges des esprits.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-6 bg-background/50 rounded-3xl border border-primary/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 opacity-40" />
                        <p className="font-black text-sm uppercase tracking-widest">Maintenance</p>
                      </div>
                      <p className="text-[10px] opacity-40 font-medium italic">Accès restreint</p>
                    </div>
                    <Switch checked={appStatus?.maintenanceMode || false} onCheckedChange={handleToggleMaintenance} className="scale-110" />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-background/50 rounded-3xl border border-primary/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 opacity-40" />
                        <p className="font-black text-sm uppercase tracking-widest">Flux Financier</p>
                      </div>
                      <p className="text-[10px] opacity-40 font-medium italic">Ouverture des retraits</p>
                    </div>
                    <Switch checked={appStatus?.exchangeEnabled || false} onCheckedChange={handleToggleExchange} className="scale-110" />
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-background/50 rounded-3xl border border-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareText className="h-4 w-4 opacity-40" />
                    <p className="font-black text-sm uppercase tracking-widest">Message de Maintenance</p>
                  </div>
                  <Textarea 
                    placeholder="Entrez le message à afficher aux esprits..." 
                    className="min-h-[120px] rounded-2xl bg-background/50 border-primary/10"
                    value={maintenanceMessageInput}
                    onChange={(e) => setMaintenanceMessageInput(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdateMaintenanceMessage} 
                    disabled={isSavingMessage}
                    className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest gap-2"
                  >
                    {isSavingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Mettre à jour le message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="px-1 mb-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
              <Input placeholder="Rechercher un esprit (nom ou numéro)..." className="pl-12 h-12 bg-card/20 border-none rounded-2xl" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
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
                  {filteredUsers.map((u) => (
                    <TableRow 
                      key={u.id} 
                      onClick={() => handleSelectUser(u)}
                      className="border-primary/5 hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-black text-sm">@{u.username}</span>
                          <span className="text-[10px] opacity-30">{u.phoneNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right font-black text-sm">{u.totalPoints?.toLocaleString() || 0} PTS</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogue de consultation et modification du défi */}
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
                  variant="secondary" 
                  onClick={handleAiGenerateForEdit} 
                  disabled={isGenerating} 
                  className="h-10 px-4 rounded-xl font-black text-[10px] uppercase gap-2 bg-primary/5"
                >
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 text-primary" />}
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
                      <Textarea 
                        className="min-h-[120px] rounded-2xl bg-primary/5 border-none text-lg font-bold p-6"
                        value={editedQuiz?.question}
                        onChange={e => setEditedQuiz({...editedQuiz, question: e.target.value})}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Options de Résonance</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {editedQuiz?.options.map((opt: string, idx: number) => (
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
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Intensité de la Lumière (Points)</Label>
                      <Input 
                        type="number"
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
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          haptic.medium();
                          deleteDoc(doc(db, "quizzes", selectedQuizForView.id));
                          setSelectedQuizForView(null);
                          toast({ title: "Défi supprimé", description: "L'épreuve a été retirée de la base." });
                        }}
                        className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
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
                  onClick={handleCancelEdit}
                  className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2"
                >
                  <X className="h-4 w-4" /> Annuler
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
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

      {/* Dialogue de consultation de l'esprit (Utilisateur) */}
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
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
                  <div className="relative h-24 w-24 bg-card rounded-[2rem] flex items-center justify-center border border-primary/10 shadow-2xl overflow-hidden">
                    {selectedUserForView.profileImage ? (
                      <img src={selectedUserForView.profileImage} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <User className="h-10 w-10 text-primary opacity-20" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black">@{selectedUserForView.username}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Shield className="h-3 w-3 opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Rôle: {selectedUserForView.role === 'admin' ? "Maître" : "Adepte"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/5 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Lumière Totale</p>
                  <p className="text-xl font-black">{selectedUserForView.totalPoints?.toLocaleString()} <span className="text-[10px] opacity-30">PTS</span></p>
                </div>
                <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/5 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Parrainage</p>
                  <p className="text-xl font-black tracking-tighter">{selectedUserForView.referralCode || "---"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 opacity-40">
                    <Smartphone className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Liaison Wave</span>
                  </div>
                  <span className="text-xs font-bold">{selectedUserForView.phoneNumber || "Non lié"}</span>
                </div>
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 opacity-40">
                    <Calendar className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Éveil Initial</span>
                  </div>
                  <span className="text-xs font-bold">
                    {selectedUserForView.createdAt ? format(selectedUserForView.createdAt.toDate(), "dd MMMM yyyy", { locale: fr }) : "---"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 opacity-40">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sceau Biométrique</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase ${selectedUserForView.biometricEnabled ? 'text-green-500' : 'text-red-500 opacity-40'}`}>
                    {selectedUserForView.biometricEnabled ? 'Actif' : 'Révoqué'}
                  </span>
                </div>
              </div>

              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
                <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                  "Chaque esprit est une étincelle unique dans le flux de l'Oracle."
                </p>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedUserForView(null)}
              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Fermer la fiche
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
