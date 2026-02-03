
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
  deleteDoc
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
  Brain
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      setIsDialogOpen(false);
      toast({ title: "Défi ajouté", description: "La question a été publiée." });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "quizzes", id));
      toast({ title: "Défi supprimé" });
    } catch (error) {
      console.error(error);
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
      
      <main className="flex-1 p-4 pt-20 space-y-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/profil")}
            className="rounded-full h-8 w-8 hover:bg-primary/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0">
            <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40">Console</p>
            <h1 className="text-sm font-black tracking-tight">Espace Maître</h1>
          </div>
        </div>

        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-9 rounded-xl grid grid-cols-4">
            <TabsTrigger value="stats" className="rounded-lg font-black text-[7px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3 w-3 mr-1" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="rounded-lg font-black text-[7px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Plus className="h-3 w-3 mr-1" />
              Défis
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg font-black text-[7px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings2 className="h-3 w-3 mr-1" />
              Système
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg font-black text-[7px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3 w-3 mr-1" />
              Esprits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[7px] font-black uppercase tracking-widest opacity-40">Joueurs</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-end gap-1">
                    <p className="text-xl font-black">{users?.length || 0}</p>
                    <p className="text-[6px] font-bold opacity-30 mb-0.5 uppercase">Actifs</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[7px] font-black uppercase tracking-widest opacity-40">Défis</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-end gap-1">
                    <p className="text-xl font-black">{quizzes?.length || 0}</p>
                    <p className="text-[6px] font-bold opacity-30 mb-0.5 uppercase">En Ligne</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[8px] font-black uppercase tracking-widest opacity-40">Base de Données</h3>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-8 px-4 rounded-xl font-black text-[8px] uppercase tracking-widest gap-2">
                    <Plus className="h-3 w-3" />
                    Ajouter un défi
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-2xl border-primary/5 rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black tracking-tight">Nouveau Défi</DialogTitle>
                    <p className="text-[10px] font-medium opacity-60">Créez une nouvelle épreuve pour les esprits.</p>
                  </DialogHeader>
                  <form onSubmit={handleAddQuiz} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest opacity-40">La Question</Label>
                      <Input 
                        placeholder="Ex: Quelle est l'essence du désir ?" 
                        className="h-10 text-xs font-bold rounded-xl" 
                        value={newQuiz.question} 
                        onChange={e => setNewQuiz({...newQuiz, question: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {newQuiz.options.map((opt, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <Label className="text-[8px] font-black uppercase tracking-widest opacity-40">Option {idx + 1}</Label>
                            <input 
                              type="radio" 
                              name="correct" 
                              className="accent-primary h-3 w-3"
                              checked={newQuiz.correctIndex === idx} 
                              onChange={() => setNewQuiz({...newQuiz, correctIndex: idx})}
                            />
                          </div>
                          <Input 
                            placeholder={`Réponse ${idx + 1}`} 
                            className="h-8 text-[9px] font-medium rounded-lg" 
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
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-40">Récompense (PTS)</Label>
                        <Input 
                          type="number" 
                          className="h-8 text-[10px] rounded-lg" 
                          value={newQuiz.points} 
                          onChange={e => setNewQuiz({...newQuiz, points: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-4">
                      <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publier le défi"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {quizzesLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin opacity-20" /></div>
              ) : (
                <div className="grid gap-2">
                  {quizzes?.map(q => (
                    <Card key={q.id} className="border-none bg-card/20 backdrop-blur-3xl rounded-xl overflow-hidden group">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 flex-1 overflow-hidden">
                          <p className="text-[10px] font-black leading-tight truncate">{q.question}</p>
                          <p className="text-[6px] font-bold opacity-30 uppercase tracking-widest">{q.points} PTS • {q.options.length} OPTIONS</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteQuiz(q.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {quizzes?.length === 0 && (
                    <div className="text-center py-10 opacity-20">
                      <Brain className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-widest">Aucun défi actif</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-3">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-black">Sécurité Globale</CardTitle>
                <CardDescription className="text-[8px]">Gérez l'accès des esprits au système.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-primary/5">
                  <div className="space-y-0.5">
                    <p className="font-black text-[8px] uppercase tracking-widest">Mode Maintenance</p>
                    <p className="text-[7px] opacity-40 font-medium italic">"Éveil en pause..."</p>
                  </div>
                  <Switch 
                    checked={appStatus?.maintenanceMode || false} 
                    onCheckedChange={handleToggleMaintenance}
                    className="data-[state=checked]:bg-red-500 scale-75"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="font-black text-[7px] uppercase tracking-widest opacity-40 h-8 px-3">Esprit</TableHead>
                      <TableHead className="font-black text-[7px] uppercase tracking-widest opacity-40 h-8 px-3 text-right">Lumière</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                        <TableCell className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-black text-[9px] tracking-tight">@{u.username}</span>
                            <span className="text-[6px] opacity-30 uppercase tracking-widest">
                              {u.phoneNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-right font-black text-[9px] tabular-nums">
                          {u.totalPoints?.toLocaleString() || 0} <span className="text-[6px] opacity-20">PTS</span>
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
