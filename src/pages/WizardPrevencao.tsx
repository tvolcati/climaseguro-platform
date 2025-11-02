import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import logoSvg from "@/assets/clima-seguro-logo.svg";
import { apiCreateProcess, apiUploadPhotos, apiSubmitForm, apiListFunds, apiGenerateDocuments, getDocumentUrl, apiPreflight } from "@/lib/api";

const WizardPrevencao = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [photosAI, setPhotosAI] = useState<{ id: number; filePath: string; description: string }[]>([]);
  const [formData, setFormData] = useState({
    responsavel: "",
    data_vistoria: "",
    observacoes: "",
    acao_imediata: "",
  });
  const [processId, setProcessId] = useState<number | null>(null);
  const [funds, setFunds] = useState<{ code: string; name: string; required_documents: string[] }[]>([]);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<{ id: number; name: string; type: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [preflight, setPreflight] = useState<{ status: string; documents: { doc_type: string; status: string; missing: string[] }[] } | null>(null);

  const progress = (currentStep / 3) * 100;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedPhotos((prev) => [...prev, ...files]);
    toast.success(`${files.length} foto(s) adicionada(s)`);
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = async () => {
    try {
      // Etapa 1 → criar processo e subir fotos
      if (currentStep === 1) {
        if (uploadedPhotos.length === 0) {
          toast.error("Adicione pelo menos uma foto para continuar");
          return;
        }
        setLoading(true);
        const initialContext = location?.state?.context;
        const parsedZoneId = Number.isFinite(Number(zoneId)) ? Number(zoneId) : undefined;
        const { processId: pid } = await apiCreateProcess(parsedZoneId, initialContext);
        setProcessId(pid);
        let pidToUse = pid;
        let photosResp;
        try {
          const { photos } = await apiUploadPhotos(pidToUse, uploadedPhotos);
          photosResp = photos;
        } catch (e: any) {
          // Recria processo e tenta novamente se, por algum motivo, o primeiro id ainda não existir (condições de corrida em reset de DB)
          if (String(e?.message || "").includes("404")) {
            const { processId: pid2 } = await apiCreateProcess(Number(zoneId), initialContext);
            setProcessId(pid2);
            pidToUse = pid2;
            const { photos } = await apiUploadPhotos(pidToUse, uploadedPhotos);
            photosResp = photos;
          } else {
            throw e;
          }
        }
        const photos = photosResp || [];
        setPhotosAI(photos);
        toast.success("Fotos enviadas e descritas por IA");
        setCurrentStep(2);
        return;
      }

      // Etapa 2 → enviar formulário e preparar fundos
      if (currentStep === 2) {
        if (!formData.responsavel || !formData.data_vistoria) {
          toast.error("Preencha os campos obrigatórios");
          return;
        }
        if (!processId) {
          toast.error("Processo não inicializado");
          return;
        }
        setLoading(true);
        await apiSubmitForm(processId, formData);
        const { funds } = await apiListFunds();
        setFunds(funds);
        setSelectedFund(funds[0]?.code ?? null);
        setCurrentStep(3);
        return;
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao avançar etapa");
    } finally {
      setLoading(false);
    }
  };

  // Buscar preflight quando fundo selecionado mudar
  useEffect(() => {
    const run = async () => {
      if (!processId || !selectedFund) return;
      try {
        const data = await apiPreflight(processId, selectedFund);
        setPreflight(data);
      } catch (e) {
        setPreflight(null);
      }
    };
    run();
  }, [processId, selectedFund]);

  const handlePreviousStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = () => {
    toast.success("Documentos validados e processo finalizado!");
    setTimeout(() => {
      navigate("/prefeitura/curitiba");
    }, 1500);
  };

  const handleGenerateDocs = async () => {
    if (!processId || !selectedFund) {
      toast.error("Selecione um fundo e conclua as etapas anteriores");
      return;
    }
    try {
      setLoading(true);
      const { documents } = await apiGenerateDocuments(processId, selectedFund);
      setGeneratedDocs(documents);
      toast.success("Documentos gerados");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar documentos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logoSvg} alt="ClimaSeguro" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Processo de Prevenção - Zona {Number.isFinite(Number(zoneId)) ? zoneId : (location?.state?.context?.zone?.id ?? '—')}
              </h1>
              <p className="text-sm text-muted-foreground">
                Etapa {currentStep} de 3
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/prefeitura/curitiba")}>
            Cancelar
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm">
            <span className={currentStep >= 1 ? "text-primary font-medium" : "text-muted-foreground"}>
              1. Fotos
            </span>
            <span className={currentStep >= 2 ? "text-primary font-medium" : "text-muted-foreground"}>
              2. Formulário
            </span>
            <span className={currentStep >= 3 ? "text-primary font-medium" : "text-muted-foreground"}>
              3. Validação
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Card className="max-w-4xl mx-auto p-8">
          {/* Passo 1: Upload de Fotos */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Upload de Fotos</h2>
                <p className="text-muted-foreground">
                  Adicione fotos da área de risco para documentação técnica
                </p>
              </div>

              <div className="space-y-4">
                <Label htmlFor="photos">Selecione as fotos</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="cursor-pointer"
                />
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="space-y-3">
                  <p className="font-medium">Fotos adicionadas ({uploadedPhotos.length}):</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg bg-muted flex items-center justify-center border">
                          <span className="sr-only">foto</span>
                        </div>
                        <p className="text-xs mt-1 truncate">{photo.name}</p>
                        {photosAI[index]?.description && (
                          <p className="text-xs text-muted-foreground mt-1">{photosAI[index].description}</p>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleNextStep} size="lg" disabled={loading}>
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {/* Passo 2: Formulário */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Informações da Vistoria</h2>
                <p className="text-muted-foreground">
                  Preencha os dados técnicos da vistoria realizada
                </p>
              </div>

              {/* Resumo das fotos com descrição da IA */}
              {photosAI.length > 0 && (
                <div className="space-y-3">
                  <p className="font-medium">Fotos e descrições geradas pela IA:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {photosAI.map((p) => (
                      <Card key={p.id} className="p-4">
                        <p className="text-sm text-muted-foreground break-words">{p.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="responsavel">
                    Responsável pela Vistoria <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="responsavel"
                    placeholder="Nome completo do técnico"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_vistoria">
                    Data da Vistoria <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="data_vistoria"
                    type="date"
                    value={formData.data_vistoria}
                    onChange={(e) => setFormData({ ...formData, data_vistoria: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações Técnicas</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Descreva condições do terreno, riscos identificados, etc."
                    rows={5}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acao_imediata">Ação Imediata Recomendada</Label>
                  <Textarea
                    id="acao_imediata"
                    placeholder="Descreva ações prioritárias a serem tomadas"
                    rows={4}
                    value={formData.acao_imediata}
                    onChange={(e) => setFormData({ ...formData, acao_imediata: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>
                  ← Voltar
                </Button>
                <Button onClick={handleNextStep} size="lg" disabled={loading}>
                  Gerar Documentos
                </Button>
              </div>
            </div>
          )}

          {/* Passo 3: Validação de Documentos */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Validar Documentos</h2>
                <p className="text-muted-foreground">
                  Revise os documentos gerados antes de finalizar o processo
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="font-medium">Selecione o fundo para submissão:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {funds.map((f) => (
                      <Card key={f.code} className={`p-4 cursor-pointer ${selectedFund === f.code ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedFund(f.code)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground">Documentos: {f.required_documents.join(', ')}</p>
                          </div>
                          <Button variant={selectedFund === f.code ? 'default' : 'outline'} size="sm">Selecionar</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Documentos exigidos pelo fundo selecionado */}
                {selectedFund && (
                  <div className="text-sm">
                    <p className="font-medium mb-2">Requisitos por documento</p>
                    <div className="space-y-2">
                      {(preflight?.documents || []).map((d) => (
                        <Card key={d.doc_type} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{d.doc_type}</span>
                            <span className={`text-xs px-2 py-1 rounded ${d.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {d.status === 'ok' ? 'OK' : 'Pendências'}
                            </span>
                          </div>
                          {d.missing.length > 0 && (
                            <ul className="list-disc ml-5 mt-1 text-xs text-muted-foreground">
                              {d.missing.map((m) => (<li key={m}>{m}</li>))}
                            </ul>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleGenerateDocs} disabled={loading || !selectedFund}>
                    Gerar Documentos
                  </Button>
                </div>

                {generatedDocs.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-medium">Documentos gerados:</p>
                    {generatedDocs.map((doc) => (
                      <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="sr-only">documento</span>
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">Zona {zoneId} - {new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                          <a href={getDocumentUrl(doc.url)} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm">Visualizar</Button>
                          </a>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>📌 Próximos passos:</strong> Após a validação, os documentos serão enviados
                  automaticamente para a Defesa Civil e moradores da área afetada.
                </p>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>
                  ← Voltar
                </Button>
                <Button onClick={handleFinish} size="lg" className="bg-green-600 hover:bg-green-700" disabled={generatedDocs.length === 0}>
                  Validar e Finalizar
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default WizardPrevencao;
