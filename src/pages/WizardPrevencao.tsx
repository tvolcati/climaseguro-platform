import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import logoSvg from "@/assets/clima-seguro-logo.svg";

const WizardPrevencao = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    responsavel: "",
    data_vistoria: "",
    observacoes: "",
    acao_imediata: "",
  });
  const [generatedDocs, setGeneratedDocs] = useState<string[]>([]);

  const progress = (currentStep / 3) * 100;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedPhotos((prev) => [...prev, ...files]);
    toast.success(`${files.length} foto(s) adicionada(s)`);
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (currentStep === 1 && uploadedPhotos.length === 0) {
      toast.error("Adicione pelo menos uma foto para continuar");
      return;
    }
    if (currentStep === 2) {
      if (!formData.responsavel || !formData.data_vistoria) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }
      // Simula geração de documentos
      setGeneratedDocs([
        "Ofício de Notificação aos Moradores",
        "Relatório Técnico de Risco",
        "Plano de Ação Emergencial",
      ]);
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = () => {
    toast.success("Documentos validados e processo finalizado!");
    setTimeout(() => {
      navigate("/prefeitura/curitiba");
    }, 1500);
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
                Processo de Prevenção - Zona {zoneId}
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
                <h2 className="text-2xl font-bold mb-2">📸 Upload de Fotos</h2>
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
                          <span className="text-4xl">📷</span>
                        </div>
                        <p className="text-xs mt-1 truncate">{photo.name}</p>
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
                <Button onClick={handleNextStep} size="lg">
                  Próximo →
                </Button>
              </div>
            </div>
          )}

          {/* Passo 2: Formulário */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">📝 Informações da Vistoria</h2>
                <p className="text-muted-foreground">
                  Preencha os dados técnicos da vistoria realizada
                </p>
              </div>

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
                <Button onClick={handleNextStep} size="lg">
                  Gerar Documentos →
                </Button>
              </div>
            </div>
          )}

          {/* Passo 3: Validação de Documentos */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">✅ Validar Documentos</h2>
                <p className="text-muted-foreground">
                  Revise os documentos gerados antes de finalizar o processo
                </p>
              </div>

              <div className="space-y-3">
                <p className="font-medium">Documentos gerados:</p>
                {generatedDocs.map((doc, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="font-medium">{doc}</p>
                          <p className="text-xs text-muted-foreground">Zona {zoneId} - {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Visualizar
                      </Button>
                    </div>
                  </Card>
                ))}
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
                <Button onClick={handleFinish} size="lg" className="bg-green-600 hover:bg-green-700">
                  ✓ Validar e Finalizar
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
