
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
  increment
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/table";
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
  MinusCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [pointsToSubtract, setPointsToSubtract] = useState<number>(0);

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

  const { data: users, loading: usersLoading } = useCollection(usersQuery);
  const { data: quizzes, loading: quizzesLoading } = useCollection(quizzesQuery);

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
    setDoc(appConfigRef, {
      maintenanceMode: checked,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch((error) => {
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

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || isSubmitting) return;
    
    if (newQuiz.question.trim() === "" || newQuiz.options.some(o => o.trim() === "")) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir tous les champs." });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "quizzes"), {
        ...newQuiz,
        createdAt: serverTimestamp()
      });
      setNewQuiz({
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        points: 100
      });
      setIsAddDialogOpen(false);
      toast({ title: "Défi ajouté", description: "La question a été publiée." });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedQuiz || isSubmitting) return;

    setIsSubmitting(true);
    const quizRef = doc(db, "quizzes", selectedQuiz.id);
    
    updateDoc(quizRef, {
      question: selectedQuiz.question,
      options: selectedQuiz.options,
      correctIndex: selectedQuiz.correctIndex,
      points: selectedQuiz.points,
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({ title: "Défi mis à jour" });
      setIsViewDialogOpen(false);
      setIsEditMode(false);
    }).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: quizRef.path,
        operation: 'update',
        requestResourceData: selectedQuiz,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;
    try {
      await deleteDoc(doc(db, "quizzes", id));
      toast({ title: "Défi supprimé" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubtractPoints = async () => {
    if (!db || !selectedAdminUser || pointsToSubtract <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    const userRef = doc(db, "users", selectedAdminUser.id);
    
    updateDoc(userRef, {
      totalPoints: increment(-pointsToSubtract),
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({ 
        title: "Points retirés", 
        description: `${pointsToSubtract} points ont été déduits de @${selectedAdminUser.username}.`
      });
      setPointsToSubtract(0);
      setIsUserDialogOpen(false);
    }).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { totalPoints: increment(-pointsToSubtract) },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const openQuizDetails = (quiz: any) => {
    setSelectedQuiz({...quiz});
    setIsEditMode(false);
    setIsViewDialogOpen(true);
  };

  const openUserDetails = (userData: any) => {
    setSelectedAdminUser(userData);
    setPointsToSubtract(0);
    setIsUserDialogOpen(true);
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
      
      <main className="flex-1 p-4 pt-32 space-y-4 md:space-y-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/profil")}
            className="rounded-full h-8 w-8 md:h-12 md:w-12 hover:bg-primary/5"
          >
            <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
          </Button>
          <div className="space-y-0">
            <p className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Console</p>
            <h1 className="text-sm md:text-2xl font-black tracking-tight">Espace Maître</h1>
          </div>
        </div>

        <Tabs defaultValue="stats" className="space-y-4 md:space-y-8">
          <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-9 md:h-14 rounded-xl md:rounded-2xl grid grid-cols-4">
            <TabsTrigger value="stats" className="rounded-lg md:rounded-xl font-black text-[7px] md:text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <BarChart3 className="h-3 w-3 md:h-5 md:w-5 mr-1 md:mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="rounded-lg md:rounded-xl font-black text-[7px] md:text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Plus className="h-3 w-3 md:h-5 md:w-5 mr-1 md:mr-2" />
              Défis
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg md:rounded-xl font-black text-[7px] md:text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Settings2 className="h-3 w-3 md:h-5 md:w-5 mr-1 md:mr-2" />
              Système
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg md:rounded-xl font-black text-[7px] md:text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Users className="h-3 w-3 md:h-5 md:w-5 mr-1 md:mr-2" />
              Esprits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-3 md:space-y-6">
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl md:rounded-[2rem]">
                <CardHeader className="p-3 pb-1 md:p-6 md:pb-2">
                  <CardTitle className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-40">Joueurs</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="flex items-end gap-1 md:gap-2">
                    <p className="text-xl md:text-5xl font-black">{users?.length || 0}</p>
                    <p className="text-[6px] md:text-[10px] font-bold opacity-30 mb-0.5 md:mb-1.5 uppercase tracking-tighter">Actifs</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl md:rounded-[2rem]">
                <CardHeader className="p-3 pb-1 md:p-6 md:pb-2">
                  <CardTitle className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-40">Défis</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="flex items-end gap-1 md:gap-2">
                    <p className="text-xl md:text-5xl font-black">{quizzes?.length || 0}</p>
                    <p className="text-[6px] md:text-[10px] font-bold opacity-30 mb-0.5 md:mb-1.5 uppercase tracking-tighter">En Ligne</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4 md:space-y-8">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[8px] md:text-xs font-black uppercase tracking-widest opacity-40">Base de Données</h3>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-8 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl font-black text-[8px] md:text-xs uppercase tracking-widest gap-2 md:gap-3 shadow-lg shadow-primary/10">
                    <Plus className="h-3 w-3 md:h-5 md:w-5" />
                    Ajouter un défi
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-primary/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
                  <DialogHeader>
                    <DialogTitle className="text-lg md:text-3xl font-black tracking-tight">Nouveau Défi</DialogTitle>
                    <p className="text-[10px] md:text-sm font-medium opacity-60">Créez une nouvelle épreuve pour les esprits.</p>
                  </DialogHeader>
                  <form onSubmit={handleAddQuiz} className="space-y-4 md:space-y-6 pt-4 md:pt-8">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-[9px] md:text-xs font-black uppercase tracking-widest opacity-40">La Question</Label>
                      <Input 
                        placeholder="Ex: Quelle est l'essence du désir ?" 
                        className="h-10 md:h-14 text-xs md:text-lg font-bold rounded-xl md:rounded-2xl" 
                        value={newQuiz.question} 
                        onChange={e => setNewQuiz({...newQuiz, question: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      {newQuiz.options.map((opt, idx) => (
                        <div key={idx} className="space-y-1 md:space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[8px] md:text-xs font-black uppercase tracking-widest opacity-40">Option {idx + 1}</Label>
                            <input 
                              type="radio" 
                              name="correct" 
                              className="accent-primary h-3 w-3 md:h-5 md:w-5"
                              checked={newQuiz.correctIndex === idx} 
                              onChange={() => setNewQuiz({...newQuiz, correctIndex: idx})}
                            />
                          </div>
                          <Input 
                            placeholder={`Réponse ${idx + 1}`} 
                            className="h-8 md:h-12 text-[9px] md:text-sm font-medium rounded-lg md:rounded-xl" 
                            value={opt} 
                            onChange={e => {
                              const newOpts = [...newQuiz.options];
                              newOpts[idx] = e.target.value;
                              setNewQuiz({...newQuiz, options: newOpts});
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5 md:space-y-2">
                        <Label className="text-[9px] md:text-xs font-black uppercase tracking-widest opacity-40">Récompense (PTS)</Label>
                        <Input 
                          type="number" 
                          className="h-8 md:h-12 text-[10px] md:text-sm rounded-lg md:rounded-xl" 
                          value={newQuiz.points} 
                          onChange={e => setNewQuiz({...newQuiz, points: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-4 md:pt-8">
                      <Button type="submit" disabled={isSubmitting} className="w-full h-12 md:h-16 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm uppercase tracking-widest">
                        {isSubmitting ? <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" /> : "Publier le défi"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2 md:space-y-4">
              {quizzesLoading ? (
                <div className="flex justify-center p-8 md:p-16"><Loader2 className="h-5 w-5 md:h-10 md:w-10 animate-spin opacity-20" /></div>
              ) : (
                <div className="grid gap-2 md:gap-4">
                  {quizzes?.map(q => (
                    <Card 
                      key={q.id} 
                      onClick={() => openQuizDetails(q)}
                      className="border-none bg-card/20 backdrop-blur-3xl rounded-xl md:rounded-3xl overflow-hidden group hover:bg-card/40 transition-all cursor-pointer"
                    >
                      <CardContent className="p-3 md:p-6 flex items-center justify-between gap-3 md:gap-6">
                        <div className="space-y-0.5 md:space-y-1 flex-1 overflow-hidden">
                          <p className="text-[10px] md:text-base font-black leading-tight truncate">{q.question}</p>
                          <p className="text-[6px] md:text-xs font-bold opacity-30 uppercase tracking-widest">{q.points} PTS • {q.options.length} OPTIONS</p>
                        </div>
                        <div className="flex gap-1 md:gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleDeleteQuiz(q.id, e)}
                            className="h-7 w-7 md:h-12 md:w-12 text-destructive hover:bg-destructive/10 rounded-lg md:rounded-2xl shrink-0"
                          >
                            <Trash2 className="h-3 w-3 md:h-6 md:w-6" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {quizzes?.length === 0 && (
                    <div className="text-center py-10 md:py-20 opacity-20">
                      <Brain className="h-8 w-8 md:h-16 md:w-16 mx-auto mb-2 md:mb-4" />
                      <p className="text-[8px] md:text-sm font-black uppercase tracking-widest">Aucun défi actif</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-3 md:space-y-6">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl md:rounded-[2rem] overflow-hidden">
              <CardHeader className="p-4 pb-2 md:p-8 md:pb-4">
                <CardTitle className="text-xs md:text-2xl font-black">Sécurité Globale</CardTitle>
                <CardDescription className="text-[8px] md:text-sm">Gérez l'accès des esprits au système.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-8 md:pt-0">
                <div className="flex items-center justify-between p-3 md:p-6 bg-background/50 rounded-xl md:rounded-3xl border border-primary/5">
                  <div className="space-y-0.5 md:space-y-1">
                    <p className="font-black text-[8px] md:text-base uppercase tracking-widest">Mode Maintenance</p>
                    <p className="text-[7px] md:text-xs opacity-40 font-medium italic">"Éveil en pause..."</p>
                  </div>
                  <Switch 
                    checked={appStatus?.maintenanceMode || false} 
                    onCheckedChange={handleToggleMaintenance}
                    className="data-[state=checked]:bg-red-500 scale-75 md:scale-125 transition-transform"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-3 md:space-y-6">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl md:rounded-[2rem] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="font-black text-[7px] md:text-xs uppercase tracking-widest opacity-40 h-8 md:h-14 px-3 md:px-6">Esprit</TableHead>
                      <TableHead className="font-black text-[7px] md:text-xs uppercase tracking-widest opacity-40 h-8 md:h-14 px-3 md:px-6 text-right">Lumière</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow 
                        key={u.id} 
                        className="border-primary/5 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => openUserDetails(u)}
                      >
                        <TableCell className="py-2 md:py-4 px-3 md:px-6">
                          <div className="flex flex-col">
                            <span className="font-black text-[9px] md:text-base tracking-tight">@{u.username}</span>
                            <span className="text-[6px] md:text-[10px] opacity-30 uppercase tracking-widest">
                              {u.phoneNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 md:py-4 px-3 md:px-6 text-right font-black text-[9px] md:text-base tabular-nums">
                          {u.totalPoints?.toLocaleString() || 0} <span className="text-[6px] md:text-[10px] opacity-20">PTS</span>
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

      {/* Dialogue de Visualisation / Modification de Quiz */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-primary/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-3xl font-black tracking-tight">
              {isEditMode ? "Modifier le Défi" : "Détails du Défi"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuiz && (
            <form onSubmit={handleUpdateQuiz} className="space-y-4 md:space-y-6 pt-4 md:pt-8">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-[9px] md:text-xs font-black uppercase tracking-widest opacity-40">La Question</Label>
                {isEditMode ? (
                  <Input 
                    placeholder="Ex: Quelle est l'essence du désir ?" 
                    className="h-10 md:h-14 text-xs md:text-lg font-bold rounded-xl md:rounded-2xl" 
                    value={selectedQuiz.question} 
                    onChange={e => setSelectedQuiz({...selectedQuiz, question: e.target.value})}
                  />
                ) : (
                  <p className="text-xs md:text-lg font-bold p-3 bg-primary/5 rounded-xl">{selectedQuiz.question}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {selectedQuiz.options.map((opt: string, idx: number) => (
                  <div key={idx} className="space-y-1 md:space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[8px] md:text-xs font-black uppercase tracking-widest opacity-40">Option {idx + 1}</Label>
                      {isEditMode && (
                        <input 
                          type="radio" 
                          name="edit-correct" 
                          className="accent-primary h-3 w-3 md:h-5 md:w-5"
                          checked={selectedQuiz.correctIndex === idx} 
                          onChange={() => setSelectedQuiz({...selectedQuiz, correctIndex: idx})}
                        />
                      )}
                    </div>
                    {isEditMode ? (
                      <Input 
                        placeholder={`Réponse ${idx + 1}`} 
                        className="h-8 md:h-12 text-[9px] md:text-sm font-medium rounded-lg md:rounded-xl" 
                        value={opt} 
                        onChange={e => {
                          const newOpts = [...selectedQuiz.options];
                          newOpts[idx] = e.target.value;
                          setSelectedQuiz({...selectedQuiz, options: newOpts});
                        }}
                      />
                    ) : (
                      <div className={`p-2 rounded-lg text-[10px] md:text-sm font-medium border ${selectedQuiz.correctIndex === idx ? 'bg-green-500/10 border-green-500/50 text-green-600' : 'bg-primary/5 border-transparent opacity-60'}`}>
                        {opt}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5 md:space-y-2">
                  <Label className="text-[9px] md:text-xs font-black uppercase tracking-widest opacity-40">Récompense (PTS)</Label>
                  {isEditMode ? (
                    <Input 
                      type="number" 
                      className="h-8 md:h-12 text-[10px] md:text-sm rounded-lg md:rounded-xl" 
                      value={selectedQuiz.points} 
                      onChange={e => setSelectedQuiz({...selectedQuiz, points: parseInt(e.target.value) || 0})}
                    />
                  ) : (
                    <p className="text-xs md:text-lg font-black">{selectedQuiz.points} PTS</p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4 md:pt-8 gap-2">
                {isEditMode ? (
                  <>
                    <Button 
                      type="button" 
                      variant="ghost"
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 h-12 md:h-16 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm uppercase tracking-widest"
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="flex-1 h-12 md:h-16 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm uppercase tracking-widest"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" /> : "Enregistrer"}
                    </Button>
                  </>
                ) : (
                  <Button 
                    type="button" 
                    onClick={() => setIsEditMode(true)}
                    className="w-full h-12 md:h-16 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm uppercase tracking-widest gap-2"
                  >
                    <Edit3 className="h-4 w-4 md:h-5 md:w-5" />
                    Modifier ce défi
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de Détails de l'Utilisateur */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-primary/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-3xl font-black tracking-tight flex items-center gap-3">
              <User className="h-6 w-6 md:h-8 md:w-8" />
              Fiche de l'Esprit
            </DialogTitle>
          </DialogHeader>

          {selectedAdminUser && (
            <div className="space-y-6 md:space-y-8 pt-4 md:pt-8">
              <div className="flex flex-col items-center gap-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                <div className="text-center">
                  <p className="text-2xl md:text-4xl font-black tracking-tight">@{selectedAdminUser.username}</p>
                  <p className="text-[10px] md:text-sm font-bold opacity-40 uppercase tracking-widest">{selectedAdminUser.phoneNumber}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] opacity-30 mb-1">Lumière Totale</p>
                  <p className="text-3xl md:text-5xl font-black tabular-nums">{selectedAdminUser.totalPoints?.toLocaleString() || 0} <span className="text-sm md:text-xl opacity-20">PTS</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">Retrait de Lumière (Pénalité)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number"
                      placeholder="Nombre de points à retirer"
                      className="h-12 md:h-16 text-lg md:text-2xl font-bold rounded-xl md:rounded-2xl"
                      value={pointsToSubtract || ""}
                      onChange={(e) => setPointsToSubtract(Math.abs(parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSubtractPoints}
                  disabled={isSubmitting || pointsToSubtract <= 0}
                  className="w-full h-12 md:h-16 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-sm uppercase tracking-widest gap-3 bg-red-500 hover:bg-red-600 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <MinusCircle className="h-5 w-5" />
                      Soustraire {pointsToSubtract || ""} points
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/5">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Genre</p>
                  <p className="text-xs md:text-base font-bold capitalize">{selectedAdminUser.gender}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/5">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Sceau</p>
                  <p className="text-xs md:text-base font-bold capitalize">{selectedAdminUser.biometricEnabled ? "Activé" : "Inactif"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
