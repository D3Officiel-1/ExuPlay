
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Trash2, 
  Users, 
  Quote as QuoteIcon, 
  BarChart3, 
  Loader2, 
  ChevronLeft,
  Search,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newQuote, setNewQuote] = useState({
    text: "",
    author: "",
    theme: "",
    work: ""
  });

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);
  
  const quotesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "quotes"));
  }, [db]);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db]);

  const { data: quotes, loading: quotesLoading } = useCollection(quotesQuery);
  const { data: users, loading: usersLoading } = useCollection(usersQuery);

  // Sécurité : redirection si pas admin
  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if (profile.role !== 'admin') {
        router.push("/home");
        toast({
          variant: "destructive",
          title: "Accès refusé",
          description: "Seuls les maîtres de l'éveil peuvent accéder à cette console."
        });
      }
    }
  }, [profile, profileLoading, authLoading, router, toast]);

  const handleAddQuote = async () => {
    if (!newQuote.text || !newQuote.author) return;

    try {
      await addDoc(collection(db, "quotes"), {
        ...newQuote,
        createdAt: serverTimestamp()
      });
      
      setIsAddDialogOpen(false);
      setNewQuote({ text: "", author: "", theme: "", work: "" });
      toast({ title: "Citation ajoutée", description: "Le savoir s'étend." });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: "quotes",
        operation: 'create',
        requestResourceData: newQuote,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await deleteDoc(doc(db, "quotes", id));
      toast({ title: "Citation retirée", description: "L'équilibre est restauré." });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: `quotes/${id}`,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter(q => 
      q.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
      q.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quotes, searchTerm]);

  if (authLoading || profileLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/profil")}
              className="rounded-full h-10 w-10 hover:bg-primary/5"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Maître de l'Éveil</p>
              <h1 className="text-3xl font-black tracking-tight">Console d'Admin</h1>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl font-black gap-2 h-12 shadow-xl shadow-primary/10">
                <Plus className="h-5 w-5" />
                Nouvelle Pensée
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/90 backdrop-blur-3xl border-none rounded-[2.5rem] shadow-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Ajouter une Pensée</DialogTitle>
                <DialogDescription className="font-medium opacity-60">
                  Enrichissez la collection globale avec une nouvelle citation philosophique.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="text" className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Citation</Label>
                  <Input 
                    id="text" 
                    placeholder="L'essence de la pensée..." 
                    className="h-12 bg-background/50 rounded-xl"
                    value={newQuote.text}
                    onChange={(e) => setNewQuote({...newQuote, text: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author" className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Auteur</Label>
                  <Input 
                    id="author" 
                    placeholder="Nom du philosophe" 
                    className="h-12 bg-background/50 rounded-xl"
                    value={newQuote.author}
                    onChange={(e) => setNewQuote({...newQuote, author: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Thème</Label>
                    <Input 
                      id="theme" 
                      placeholder="Existence, Liberté..." 
                      className="h-12 bg-background/50 rounded-xl"
                      value={newQuote.theme}
                      onChange={(e) => setNewQuote({...newQuote, theme: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work" className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Œuvre</Label>
                    <Input 
                      id="work" 
                      placeholder="Titre du livre" 
                      className="h-12 bg-background/50 rounded-xl"
                      value={newQuote.work}
                      onChange={(e) => setNewQuote({...newQuote, work: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddQuote} className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest">
                  Graver dans l'Éternité
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="stats" className="space-y-8">
          <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-14 rounded-2xl grid grid-cols-3">
            <TabsTrigger value="stats" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="quotes" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <QuoteIcon className="h-4 w-4 mr-2" />
              Citations
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Esprits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem]">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest opacity-40">Population d'Éveil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <p className="text-6xl font-black">{users?.length || 0}</p>
                    <p className="text-xs font-bold opacity-40 mb-2">UTILISATEURS ACTIFS</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem]">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest opacity-40">Savoir Accumulé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <p className="text-6xl font-black">{quotes?.length || 0}</p>
                    <p className="text-xs font-bold opacity-40 mb-2">CITATIONS DISPONIBLES</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-10 flex flex-col items-center text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 opacity-40" />
                <h3 className="text-2xl font-black">Système Stable</h3>
                <p className="text-sm opacity-60 font-medium">Tous les flux de données sont synchronisés avec l'éther numérique.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
              <Input 
                placeholder="Rechercher une pensée ou un auteur..." 
                className="h-14 bg-card/40 backdrop-blur-3xl border-none pl-12 rounded-2xl shadow-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Citation</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Auteur</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id} className="border-primary/5 hover:bg-primary/5 transition-colors group">
                        <TableCell className="font-medium max-w-xs truncate">{quote.text}</TableCell>
                        <TableCell className="font-bold">{quote.author}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredQuotes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20 font-medium opacity-40">
                          Aucune pensée ne correspond à votre recherche.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Esprit</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Points</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Rôle</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest opacity-40 py-6">Liaison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black tracking-tight">@{u.username}</span>
                            <span className="text-[10px] opacity-40 uppercase tracking-widest">
                              DEPUIS {u.createdAt ? new Date(u.createdAt.toDate()).toLocaleDateString('fr-FR') : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold tabular-nums">{u.totalPoints?.toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-primary/5 opacity-40'}`}>
                            {u.role || 'user'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-xs opacity-60">{u.phoneNumber}</TableCell>
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
